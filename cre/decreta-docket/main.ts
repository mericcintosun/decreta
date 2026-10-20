// Decreta docket workflow (Chainlink CRE, TypeScript SDK, runs under Bun).
//
// Every cron tick, for each watched escrow:
//   1. each DON node calls CourtListener GET /api/rest/v4/dockets/{id}/
//   2. nodes agree on date_terminated and date_last_filing (median by field)
//   3. the workflow applies the same rule as lib/data.ts evaluateCondition()
//   4. if the condition is met, a signed report goes to DecretaEscrow.onReport
//      through the CRE forwarder (EVM Write), and the contract pays out.
//
// Simulate with a real Sepolia write:
//   cre workflow simulate decreta-docket --target staging-settings --broadcast
//
// Confidential HTTP: today the CourtListener token comes from CRE secrets and
// is attached in node mode. Swapping HTTPClient for the Confidential HTTP
// capability (token resolved only inside the enclave via vaultDonSecrets) is
// task 2b in HANDOFF.md. Check the exact SDK surface against the `cre init`
// TypeScript template for your CLI version.

import {
  ConsensusAggregationByFields,
  type CronPayload,
  cre,
  getNetwork,
  type HTTPSendRequester,
  hexToBase64,
  median,
  Runner,
  type Runtime,
  TxStatus,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  courtListenerBase: z.string(),
  chainSelectorName: z.string(),
  escrowAddress: z.string(),
  gasLimit: z.string(),
  watch: z.array(
    z.object({
      escrowId: z.number(),
      docketId: z.number(),
      condition: z.enum(["terminated", "filing-after"]),
      filedAfter: z.string().nullable(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

/** Days since epoch, 0 when the field is null. Numbers keep median consensus simple. */
interface DocketObservation {
  terminatedDay: number;
  lastFilingDay: number;
}

const DAY = 86_400;

function toDay(isoDate: string | null | undefined): number {
  if (!isoDate) return 0;
  return Math.floor(Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`) / 1000 / DAY);
}

// Node mode: runs on every DON node independently.
const fetchDocket = (
  sendRequester: HTTPSendRequester,
  config: Config,
  docketId: number,
  token: string
): DocketObservation => {
  const response = sendRequester
    .sendRequest({
      url: `${config.courtListenerBase}/dockets/${docketId}/?fields=id,date_terminated,date_last_filing`,
      method: "GET",
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    })
    .result();

  if (response.statusCode !== 200) {
    throw new Error(`CourtListener answered ${response.statusCode} for docket ${docketId}`);
  }

  const body = JSON.parse(new TextDecoder().decode(response.body)) as {
    date_terminated: string | null;
    date_last_filing: string | null;
  };
  return { terminatedDay: toDay(body.date_terminated), lastFilingDay: toDay(body.date_last_filing) };
};

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const config = runtime.config;
  const token = runtime.getSecret({ id: "COURTLISTENER_API_TOKEN" }).result().value;

  const network = getNetwork({ chainFamily: "evm", chainSelectorName: config.chainSelectorName, isTestnet: true });
  if (!network) throw new Error(`Unknown chain selector ${config.chainSelectorName}`);
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector);
  const http = new cre.capabilities.HTTPClient();

  const results: string[] = [];

  for (const w of config.watch) {
    const observed = http
      .sendRequest(
        runtime,
        fetchDocket,
        ConsensusAggregationByFields<DocketObservation>({ terminatedDay: median, lastFilingDay: median })
      )(config, w.docketId, token)
      .result();

    const met =
      w.condition === "terminated"
        ? observed.terminatedDay > 0
        : observed.lastFilingDay > toDay(w.filedAfter);

    runtime.log(
      `escrow ${w.escrowId} docket ${w.docketId}: terminatedDay=${observed.terminatedDay} lastFilingDay=${observed.lastFilingDay} met=${met}`
    );

    // Only write when there is something to do; an unmet check costs no gas.
    if (!met) {
      results.push(`${w.escrowId}:waiting`);
      continue;
    }

    const observedAt = BigInt(Math.max(observed.terminatedDay, observed.lastFilingDay) * DAY);
    const payload = encodeAbiParameters(parseAbiParameters("uint256 escrowId, bool met, uint64 observedAt"), [
      BigInt(w.escrowId),
      true,
      observedAt,
    ]);

    const report = runtime
      .report({ encodedPayload: hexToBase64(payload), encoderName: "evm", signingAlgo: "ecdsa", hashingAlgo: "keccak256" })
      .result();

    const write = evm
      .writeReport(runtime, { receiver: config.escrowAddress, report, gasConfig: { gasLimit: config.gasLimit } })
      .result();

    if (write.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`EVM write failed for escrow ${w.escrowId}: ${write.errorMessage ?? "unknown error"}`);
    }
    runtime.log(`escrow ${w.escrowId}: release report delivered`);
    results.push(`${w.escrowId}:released`);
  }

  return results.join(",");
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();

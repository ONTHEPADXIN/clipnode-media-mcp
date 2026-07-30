const { spawn } = require("child_process");
const http = require("http");
const https = require("https");
const path = require("path");

function argsFromArgv(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function booleanArg(value, fallback) {
  if (typeof value === "undefined") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function scenarioList(argv) {
  const profile = String(argv.profile || process.env.CLIPNODE_SUITE_PROFILE || "quick");
  if (argv.scenarios) {
    return String(argv.scenarios).split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (profile === "full") {
    return [
      "template_memory",
      "image_edit_complex",
      "video_to_gif_stickers",
      "gif_stickers_timing_grid",
      "mixed_composition_stickers",
    ];
  }
  return [
    "template_memory",
    "image_edit_complex",
    "video_to_gif_stickers",
  ];
}

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pingService(baseUrl, timeoutMs) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(baseUrl);
    } catch (error) {
      resolve({ ok: false, error: `invalid baseUrl: ${error.message}` });
      return;
    }
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, { method: "GET", timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, statusCode: res.statusCode });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
    req.on("error", (error) => {
      resolve({ ok: false, error: error.message });
    });
    req.end();
  });
}

async function waitForService(baseUrl, options) {
  const attempts = Math.max(1, options.preflightRetries);
  let latest = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    latest = await pingService(baseUrl, options.preflightTimeoutMs);
    console.log(`SERVICE_CHECK ${JSON.stringify({ attempt, ok: latest.ok, statusCode: latest.statusCode || 0, error: latest.error || "" })}`);
    if (latest.ok) {
      return latest;
    }
    if (attempt < attempts) {
      await sleep(options.preflightDelayMs);
    }
  }
  return latest || { ok: false, error: "service check did not run" };
}

const scenarios = {
  template_memory: {
    description: "Template-driven phone images/GIFs to MP4 with random 3D transitions and text stickers.",
    file: "image-memory-video.mcp-client.js",
    args: [
      "--count", "2",
      "--titleText", "Suite Memory",
      "--endingText", "ClipNode Suite",
    ],
    timeoutMs: 6 * 60 * 1000,
  },
  image_edit_complex: {
    description: "Phone image edit with canvas, fit, rotate/flip, text, image sticker, GIF sticker, and PNG export.",
    file: "image-edit-title.mcp-client.js",
    args: [
      "--outputWidth", "720",
      "--outputHeight", "1280",
      "--fitMode", "center_inside",
      "--rotateDegrees", "90",
      "--flipHorizontal", "true",
      "--format", "png",
      "--imageSticker", "true",
      "--gifSticker", "true",
    ],
    timeoutMs: 5 * 60 * 1000,
  },
  video_to_gif_stickers: {
    description: "Phone video clip to GIF with crop, reverse, frame sampling, and text/image/GIF stickers.",
    file: "video-to-gif.mcp-client.js",
    args: [
      "--endUs", "1500000",
      "--fps", "10",
      "--frameSpace", "1",
      "--backward", "true",
      "--outputWidth", "320",
      "--outputHeight", "320",
      "--stickers", "true",
    ],
    timeoutMs: 6 * 60 * 1000,
  },
  gif_stickers_timing_grid: {
    description: "Phone GIF edit with time range, animated stickers, grid stickers, and half-timeline visibility.",
    file: "gif-stickers.mcp-client.js",
    args: [
      "--timeStartUs", "0",
      "--timeEndUs", "1600000",
      "--timingMode", "half",
      "--grid", "true",
      "--animated", "true",
      "--frameSpace", "4",
      "--outputWidth", "360",
      "--outputHeight", "360",
    ],
    timeoutMs: 7 * 60 * 1000,
  },
  mixed_composition_stickers: {
    description: "Phone video + images/GIFs composition with transitions, probe, text sticker, MP4 export, and download.",
    file: "video-composition-mixed-stickers.mcp-client.js",
    args: [],
    timeoutMs: 8 * 60 * 1000,
  },
};

function compactLine(line) {
  if (!line) {
    return "";
  }
  return line.length > 1200 ? `${line.slice(0, 1200)}...` : line;
}

function runScenario(name, scenario, options) {
  const startedAt = Date.now();
  const scriptPath = path.join(__dirname, scenario.file);
  const env = {
    ...process.env,
    CLIPNODE_BASE_URL: options.baseUrl,
    CLIPNODE_PIN: options.pin,
  };
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [scriptPath, ...scenario.args], {
      cwd: __dirname,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      stderr += `\nScenario timed out after ${scenario.timeoutMs}ms`;
    }, scenario.timeoutMs);

    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.verbose) {
        text.split(/\r?\n/).filter(Boolean).forEach((line) => {
          console.log(`[${name}] ${compactLine(line)}`);
        });
      }
    });
    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      text.split(/\r?\n/).filter(Boolean).forEach((line) => {
        console.error(`[${name}:stderr] ${compactLine(line)}`);
      });
    });
    proc.on("close", (code, signal) => {
      clearTimeout(timeout);
      const doneLine = stdout.split(/\r?\n/).find((line) => line.startsWith("DONE "));
      const taskStatusLine = stdout.split(/\r?\n/).reverse().find((line) => line.startsWith("TASK_STATUS "));
      resolve({
        name,
        ok: code === 0,
        code,
        signal,
        durationMs: Date.now() - startedAt,
        done: doneLine || "",
        taskStatus: taskStatusLine || "",
        stderr: stderr.trim(),
      });
    });
  });
}

async function main() {
  const argv = argsFromArgv(process.argv);
  const baseUrl = argv.baseUrl || process.env.CLIPNODE_BASE_URL || "";
  const pin = argv.pin || process.env.CLIPNODE_PIN || "";
  const continueOnFail = booleanArg(argv.continueOnFail, true);
  const verbose = booleanArg(argv.verbose, false);
  const preflightRetries = Math.max(1, numberArg(argv.preflightRetries || process.env.CLIPNODE_SUITE_PREFLIGHT_RETRIES, 3));
  const preflightDelayMs = Math.max(0, numberArg(argv.preflightDelayMs || process.env.CLIPNODE_SUITE_PREFLIGHT_DELAY_MS, 1500));
  const preflightTimeoutMs = Math.max(500, numberArg(argv.preflightTimeoutMs || process.env.CLIPNODE_SUITE_PREFLIGHT_TIMEOUT_MS, 3000));
  const selected = scenarioList(argv);
  const unknown = selected.filter((name) => !scenarios[name]);
  if (unknown.length > 0) {
    throw new Error(`unknown scenarios: ${unknown.join(", ")}`);
  }
  if (!baseUrl || !pin) {
    throw new Error("CLIPNODE_BASE_URL and CLIPNODE_PIN are required.");
  }

  console.log(`SUITE_BEGIN ${JSON.stringify({ baseUrl, scenarios: selected, verbose })}`);
  const results = [];
  for (const name of selected) {
    const scenario = scenarios[name];
    console.log(`SCENARIO_BEGIN ${JSON.stringify({ name, description: scenario.description })}`);
    const service = await waitForService(baseUrl, {
      preflightRetries,
      preflightDelayMs,
      preflightTimeoutMs,
    });
    if (!service.ok) {
      const result = {
        name,
        ok: false,
        code: -1,
        signal: null,
        durationMs: 0,
        done: "",
        taskStatus: "",
        stderr: `service unavailable: ${service.error || service.statusCode || "unknown"}`,
      };
      results.push(result);
      console.log(`SCENARIO_RESULT ${JSON.stringify(result)}`);
      if (!continueOnFail) {
        break;
      }
      continue;
    }
    const result = await runScenario(name, scenario, { baseUrl, pin, verbose });
    results.push(result);
    console.log(`SCENARIO_RESULT ${JSON.stringify(result)}`);
    if (!result.ok && !continueOnFail) {
      break;
    }
  }
  const failed = results.filter((item) => !item.ok);
  console.log(`SUITE_RESULT ${JSON.stringify({
    ok: failed.length === 0,
    passed: results.length - failed.length,
    failed: failed.length,
    scenarios: results.map((item) => ({
      name: item.name,
      ok: item.ok,
      durationMs: item.durationMs,
      done: item.done,
    })),
  })}`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.stack || error.message}`);
  process.exitCode = 1;
});

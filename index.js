// FREE Version - Groq pe chalega, OpenAI credit nahi lagega
require("dotenv").config();
const Groq = require("groq-sdk");
const readline = require("readline");

// .env me GROQ_API_KEY daalni hai
if (!process.env.GROQ_API_KEY) {
  console.log("\n❌ GROQ_API_KEY nahi mili!");
  console.log("1. https://console.groq.com/keys pe jao");
  console.log("2. Free key banao");
  console.log("3. .env me aise daalo: GROQ_API_KEY=gsk_xxxx\n");
  process.exit(1);
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============ TOOLS - same tumhare wale ============
async function search_web(query) {
  console.log(`[TOOL] search_web: ${query}`);
  if (query.toLowerCase().includes("hotel")) {
    return "Hotel Royal Jaipur: Deluxe Rs 2500, Suite Rs 4000, Pool, Breakfast free, Location Amer Road.";
  }
  return `Web result for ${query}: Jaipur is best for tourism, Oct-March season.`;
}

async function check_availability(date, room_type = "Deluxe") {
  console.log(`[TOOL] check_availability: ${date}`);
  return `${date} ko ${room_type} AVAILABLE hai. Price Rs 2500. Book kar du?`;
}

async function create_booking(name, phone, date) {
  console.log(`[TOOL] create_booking: ${name}`);
  return `Booking CONFIRMED for ${name} (${phone}) on ${date}. ID: JAI-${Date.now().toString().slice(-5)}`;
}

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Kisi bhi info ke liye web search karo, guess mat karo",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Room available hai ya nahi check karo",
      parameters: { type: "object", properties: { date: { type: "string" }, room_type: { type: "string" } }, required: ["date"] }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Booking confirm karna",
      parameters: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, date: { type: "string" } }, required: ["name", "phone", "date"] }
    }
  }
];

const toolFunctions = { search_web, check_availability, create_booking };

// ============ AGENT BRAIN ============
const SYSTEM_PROMPT = `
You are Tara - AI Receptionist for Hotel Royal Jaipur, Amer.
Speak in Hinglish, friendly.
Rules:
1. Hamesha search_web use karo info ke liye.
2. Booking se pehle check_availability chalao.
3. Short reply do, 2-3 line.
`;

let messages = [{ role: "system", content: SYSTEM_PROMPT }];

async function runAgent(userInput) {
  messages.push({ role: "user", content: userInput });

  while (true) {
    const res = await client.chat.completions.create({
      model: "openai/gpt-oss-20b", 
      messages: messages,
      tools: toolDefinitions,
      tool_choice: "auto"
    });

    const msg = res.choices[0].message;

    if (msg.tool_calls) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        const args = JSON.parse(tc.function.arguments);
        console.log(`🤖 Agent -> ${fnName}()`);
        const result = await toolFunctions[fnName](...Object.values(args));
        messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
      }
      continue;
    } else {
      messages.push({ role: "assistant", content: msg.content });
      return msg.content;
    }
  }
}

// ============ CHAT LOOP ============
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("🏨 Tara Ready! (FREE Groq pe) (type 'exit' to quit)\n");

function ask() {
  rl.question("You: ", async (input) => {
    if (input === "exit") return rl.close();
    try {
      const reply = await runAgent(input);
      console.log(`\nTara: ${reply}\n`);
    } catch (e) {
      console.error("Error:", e.message);
    }
    ask();
  });
}
ask();
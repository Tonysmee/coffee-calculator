export const runtime = "edge";

const MCP_URL   = "https://drivemcp.googleapis.com/mcp/v1";
const MODEL     = "claude-sonnet-4-20250514";

export async function POST(req) {
  try {
    const { toolName, toolInput } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const body = {
      model: MODEL,
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `Use the ${toolName} tool with these exact parameters: ${JSON.stringify(toolInput)}`
      }],
      mcp_servers: [{ type: "url", url: MCP_URL, name: "gdrive" }],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.content) return Response.json({ result: null });

    // Extract result from mcp_tool_result block first
    const toolResult = data.content.find(b => b.type === "mcp_tool_result");
    if (toolResult) {
      const text = toolResult.content?.[0]?.text || toolResult.content || "";
      return Response.json({ result: typeof text === "string" ? text : JSON.stringify(text) });
    }

    // Fallback: join text blocks
    const texts = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return Response.json({ result: texts || null });

  } catch (e) {
    console.error("Drive API error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

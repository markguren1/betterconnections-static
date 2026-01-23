module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { parentType, emailContext, situationContext } = req.body;

    // Validate input
    if (!parentType || !emailContext || !situationContext) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Personality-specific prompts
    const personalityPrompts = {
      balanced: "Create a balanced, professional response that is clear, respectful, and solution-focused.",
      driver: "Create a direct, results-focused response. Be concise and action-oriented. Get straight to the point with clear next steps.",
      analytical: "Create a detailed, data-driven response. Include specific information, timelines, and logical reasoning. Be thorough and precise.",
      expressive: "Create a warm, relationship-focused response. Show empathy and enthusiasm. Build connection while addressing concerns.",
      amiable: "Create a supportive, harmony-seeking response. Emphasize collaboration and understanding. Be gentle and reassuring."
    };

    const prompt = `You are helping a teacher write a response email to a parent. 

Parent's personality type: ${parentType}
Communication style needed: ${personalityPrompts[parentType]}

PARENT'S EMAIL:
${emailContext}

TEACHER'S SITUATION:
${situationContext}

Write a professional email response that:
1. Matches the parent's personality type and communication preferences
2. Addresses their concerns directly
3. Provides relevant information from the teacher's situation
4. Maintains a professional, respectful tone
5. Includes appropriate next steps or follow-up

Format the response as a complete email (including greeting and closing).`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return res.status(response.status).json({ error: 'API request failed' });
    }

    const data = await response.json();
    const emailResponse = data.content[0].text;

    return res.status(200).json({ email: emailResponse });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

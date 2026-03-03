/**
 * AI Commentary Generator — GPT-4o powered
 */
const OpenAI = require('openai').default

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateCommentary(ball, matchContext) {
  const { over, ballNum, batsman, bowler, runs, isWicket, isSix, isFour, wicketType, teamA, teamB, scoreText } = ball

  const eventDesc = isWicket
    ? `WICKET! ${batsman} is OUT - ${wicketType || 'dismissed'}`
    : isSix
    ? `SIX! ${batsman} hits a massive six`
    : isFour
    ? `FOUR! ${batsman} drives it to the boundary`
    : runs === 0
    ? `Dot ball. ${bowler} beats ${batsman}`
    : `${runs} run${runs > 1 ? 's' : ''}. ${batsman} hits ${bowler}`

  const prompt = `You are an energetic cricket commentator for CricketTips.ai's YouTube live stream.
Current match: ${teamA} vs ${teamB}
Score: ${scoreText}
Over ${over}.${ballNum}: ${eventDesc}

Generate EXACTLY 2 short, exciting commentary sentences (max 30 words total).
Be enthusiastic, use cricket terminology. No hashtags, no emojis.`

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 80,
      temperature: 0.8,
    })
    return res.choices[0].message.content.trim()
  } catch (err) {
    console.error('[Commentary] GPT failed:', err.message)
    return `${eventDesc}. ${scoreText}`
  }
}

module.exports = { generateCommentary }

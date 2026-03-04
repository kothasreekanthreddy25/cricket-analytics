/**
 * Run this ONCE on the VPS to get your YouTube refresh token.
 *
 * Usage:
 *   node get-refresh-token.js
 *
 * Steps:
 *   1. Run this script
 *   2. Open the URL it prints in your browser
 *   3. Authorize with your YouTube/Google account
 *   4. Paste the code from the redirect URL back here
 *   5. Copy the refresh_token into your .env
 */

require('dotenv').config()
const { google } = require('googleapis')
const readline = require('readline')

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REDIRECT_URI  = process.env.YOUTUBE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set in .env')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',   // forces Google to return a refresh_token
})

console.log('\n=================================================')
console.log('  CricketTips.ai — YouTube OAuth Setup')
console.log('=================================================\n')
console.log('1. Open this URL in your browser:\n')
console.log('   ' + authUrl)
console.log('\n2. Sign in with the Google account that owns your YouTube channel.')
console.log('3. After authorizing, Google will show you a code (or redirect to your URI).\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await oauth2Client.getToken(code.trim())
    console.log('\n=================================================')
    console.log('  SUCCESS — add these to your .env:')
    console.log('=================================================\n')
    if (tokens.refresh_token) {
      console.log('YOUTUBE_REFRESH_TOKEN=' + tokens.refresh_token)
      console.log('\n  (access_token expires and auto-refreshes — you only need the refresh_token)')
    } else {
      console.log('No refresh_token returned. Try revoking app access at:')
      console.log('  https://myaccount.google.com/permissions')
      console.log('Then run this script again.')
    }
    console.log('\nFull token object (for reference):')
    console.log(JSON.stringify(tokens, null, 2))
  } catch (err) {
    console.error('\nFailed to exchange code:', err.message)
  }
})

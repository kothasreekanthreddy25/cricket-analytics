/**
 * YouTube Video Upload
 * Uses Google OAuth2 (refresh token) to upload MP4 videos via YouTube Data API v3
 */

const { google } = require('googleapis')
const fs = require('fs')

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN })
  return client
}

async function uploadToYouTube({ videoPath, title, description, tags = [], categoryId = '17' }) {
  const auth = getOAuthClient()
  const youtube = google.youtube({ version: 'v3', auth })

  const fileSizeMB = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)
  console.log(`[YTUpload] Uploading ${fileSizeMB}MB — "${title.slice(0, 60)}"`)

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: tags.slice(0, 30),
        categoryId,
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  })

  console.log(`[YTUpload] Done — video ID: ${response.data.id}`)
  return response.data.id
}

module.exports = { uploadToYouTube }

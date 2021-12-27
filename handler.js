const { TwitterClient } = require('twitter-api-client')
const axios = require('axios')
const fs = require('fs')
const Jimp = require('jimp')
const sharp = require('sharp')
const Feed = require('rss-to-json')

const numberOfFollowers = 3
const widthHeightFollowerImage = 150
const bannerFileName = '1500x500.jpg'
const maskFileName = 'mask.png'
const followerPosition = {
  x: 1370,
  y: 800
}

function getVariable(name) {
    if (fs.existsSync(`${__dirname}/../creds.json`)) {
        return require(`${__dirname}/../creds.json`)[name]
    }
    return process.env[name]
}

const twitterClient = new TwitterClient({
    apiKey: getVariable('TWITTER_API_KEY'),
    apiSecret: getVariable('TWITTER_API_SECRET_KEY'),
    accessToken: getVariable('TWITTER_API_ACCESS_TOKEN'),
    accessTokenSecret: getVariable('TWITTER_API_ACCESS_SECRET'),
});

async function saveAvatar(user, path) {
    console.log(`Retrieving avatar...`)
    const response = await axios({
        url: user.profile_image_url_https,
        responseType: 'arraybuffer'
    })
    await sharp(response.data)
        .resize(widthHeightFollowerImage, widthHeightFollowerImage)
        .toFile(path)
}

async function getImagesOfLatestFollowers() {
    console.log(`Retrieving followers...`)
    const data = await twitterClient
        .accountsAndUsers
        .followersList({
            screen_name: getVariable('TWITTER_HANDLE'),
            count: numberOfFollowers
    })
    await Promise.all(data.users
        .map((user, index) => saveAvatar(user, `/tmp/${index}.png`)))
}

async function createBanner() {
    const banner = await Jimp.read(`${__dirname}/assets/${bannerFileName}`)
    const mask = await Jimp.read(`${__dirname}/assets/${maskFileName}`)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
    // build banner
    console.log(`Adding followers...`)
    await Promise.all([...Array(numberOfFollowers)].map((_, i) => {
        return new Promise(async resolve => {
            const image = await Jimp.read(`/tmp/${i}.png`)
            const x = followerPosition.x + i * (widthHeightFollowerImage + 10);
            console.log(`Appending image ${i} with x=${x}`)
            banner.composite(image.mask(mask, 0, 0), x, followerPosition.y);
            resolve()
        })
    }))
    await banner.writeAsync('/tmp/1500x500_final.png');
}

async function uploadBanner() {
    console.log(`Uploading to twitter...`)
    const base64 = await fs.readFileSync('/tmp/1500x500_final.png', { encoding: 'base64' });
    await twitterClient.accountsAndUsers
        .accountUpdateProfileBanner({ banner: base64 })
}

module.exports.handler = async () => {
    await getImagesOfLatestFollowers()
    await createBanner()
    await uploadBanner()
}


if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    this.handler()
}

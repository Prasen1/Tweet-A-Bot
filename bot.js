import { TwitterApi } from 'twitter-api-v2';
import 'dotenv/config';
import { deShortenUrl } from './url-deshortener.js';
import { readTweetIdsFromFile, writeTweetIdsToFile } from './file-handler.js';
import { getTestResult } from './cp-request-handler.js';

const BOT_USER_ID = "843073955107889153";
const LATEST_MENTIONS_TO_FETCH = 10;

let repliedTweetsObj = await readTweetIdsFromFile();
let repliedTweetIds = repliedTweetsObj.replied_tweet_ids;
console.log(repliedTweetsObj)
console.log(repliedTweetIds)


// OAuth 1.0 Twitter Authentication 
const client = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

// Driver code for bot
async function runBot() {
  client.get(`https://api.twitter.com/2/users/${BOT_USER_ID}/mentions?tweet.fields=author_id`)
    .then(response => {
      console.log(JSON.stringify(response));
      const latestMentions = response.data.slice(0, LATEST_MENTIONS_TO_FETCH);
      latestMentions.forEach(tweet => {
        // Check if tweet has already been replied to
        if (!repliedTweetIds.includes(tweet.id)) {
          let tweetedText = tweet.text;
          //Check if bot was mentioned for running a test. Keywords are 'CPTest' and 'from'
          //TODO case insensitive match
          if (tweetedText.includes('CPTest') && ('from')) {
            console.log(tweetedText);
            let testUrl = tweetedText.split('CPTest')[1].split('from')[0].trim();
            let testLocation = tweetedText.split('CPTest')[1].split('from')[1].trim();
            testLocation = testLocation.toLowerCase();
            //TODO shortener           
            //testUrl=deShortenUrl(testUrl)
            //console.log("After conversion", testUrl);
            let node = getNode(testLocation);
            let postTweetResp;
            console.log(JSON.stringify(node));
            if (node.length != 0) {
              let nodeId = node[0][1];
              postTweetResp = respondToTweet(tweet.id, testUrl, testLocation);
              postTweetResp
                .then(console.log)
                .catch(console.error)

              repliedTweetIds.push(tweet.id);
              console.log(repliedTweetsObj)
              writeTweetIdsToFile(repliedTweetsObj)
                .then(console.log)
                .catch(console.error)

              getTestResult(testUrl, nodeId)
                .then(testResult => {
                  let postResultTweetResp;
                  if (testResult != 1) {
                    postResultTweetResp = respondToTweetWithResult(tweet.id, "Here is your test result", testResult);
                  }
                  else {
                    postResultTweetResp = respondToTweetWithResult(tweet.id, "Bot has broken down! :( We will be back after repairs", "Result fetch failure");
                  }
                  postResultTweetResp
                    .then(console.log)
                    .catch(console.error)
                })
                .catch(console.error)
            }
            else {
              postTweetResp = respondToTweet(tweet.id, testUrl, "Invalid location");
              postTweetResp
                .then(console.log)
                .catch(console.error);
              repliedTweetIds.push(tweet.id);
              console.log(repliedTweetsObj)
              writeTweetIdsToFile(repliedTweetsObj)
                .then(console.log)
                .catch(console.error)
            }
          }
          else {
            console.log("No new mentions")
          }
        }
      })
    })
}

// async function getMentions() {
//   client.get(`https://api.twitter.com/2/users/${BOT_USER_ID}/mentions?tweet.fields=author_id`)
//     .then(response => {
//       console.log(JSON.stringify(response));
//       return response;
//     })
//     .catch(console.error);
// }

// returns a 2d array if city name is matched
function getNode(cityName) {
  let nodes = [['washington dc', 766], ['new york', 748], ['chicago', 19], ['san francisco', 224], ['bangalore', 528], ['london', 98], ['paris', 1067]];
  if (cityName == '') {
    return [];
  }
  var reg = new RegExp(cityName)
  return nodes.filter(function (city) {
    if (city[0].match(reg)) {
      return (city[1]);
    }
  });
}

// Send first response to tweet
async function respondToTweet(tweetId, testUrl, testLocation) {
  console.log(tweetId, testUrl, testLocation);
  let actualTestUrl = await deShortenUrl(testUrl);
  let replyText = "";
  if (testLocation != "Invalid location") {
    replyText = `Hello! An Object Test for ${actualTestUrl} is running from ${testLocation}`
  }
  else {
    replyText = `Provided location is invalid! Please select Washington DC, New York, Chicago, San Francisco, Bangalore, London or Paris`;
  }
  console.log(replyText);
  return await client.v2.reply(replyText, tweetId);
}

// Send tweet with test result
async function respondToTweetWithResult(tweetId, replyString, testResult) {
  console.log(tweetId, testResult);
  let replyText = "";
  if (testResult != "Result fetch failure") {
    let testResultString = `DNS resolution completed in ${testResult['Dns (ms)']} ms, TCP Connection was made in ${testResult['Connect (ms)']} ms, Webpage Response Time was ${testResult['Webpage Response (ms)']} ms, Wait Time was ${testResult['Wait (ms)']} ms, Load Time was ${testResult['Load (ms)']} ms and the page downloaded ${testResult['Downloaded Bytes']} bytes`
    replyText = `${replyString}: 
${testResultString}`
  }
  else {
    replyText = `${replyString}: ${testResult}`
  }
  console.log(replyText);
  return await client.v2.reply(replyText, tweetId);
}

// await runBot();
// Call bot function every 20 secs to check for new mentions
setInterval(runBot, 20000);



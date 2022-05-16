import { readFile, writeFile } from "fs";
const REPLIED_TWEETS_FILE = './replied-tweets.json'

// read the replied tweet ids from file
async function readTweetIdsFromFile() {
    return new Promise(function (resolve, reject) {
        readFile(REPLIED_TWEETS_FILE, "utf-8", (err, data) => {
            if (err) {
                console.log(err)
                reject(err);
            }
            resolve(JSON.parse(data));
        })
    })
}

// write the replied tweet ids to file
async function writeTweetIdsToFile(repliedTweets) {
    return new Promise(function (resolve, reject) {
        writeFile(REPLIED_TWEETS_FILE, JSON.stringify(repliedTweets), (err) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve("Successfully Written to File");
        });
    })
}

export { readTweetIdsFromFile, writeTweetIdsToFile };
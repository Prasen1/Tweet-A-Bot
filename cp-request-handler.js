import fetch from 'node-fetch';
import 'dotenv/config';
import { deShortenUrl } from './url-deshortener.js';

const ON_DEMAND_URI = 'https://io.catchpoint.com/ui/api/v1/onDemandTest';
const TOKEN_URL = 'https://io.catchpoint.com/ui/api/token'
const WAIT_TIME = 2000;

let clientId = process.env.CP_API_KEY
let clientSecret = process.env.CP_API_SECRET

// Function to get authentication token from catchpoint api
function getToken(apiKey, apiSecret) {
    return new Promise((resolve, reject) => {
        fetch(TOKEN_URL,
            {
                method: 'POST',
                body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            .then(res => res.json())
            .then(json => {
                // response errors are set in the Message property of the response.
                if (json.hasOwnProperty('Message')) {
                    throw json.Message;
                } else {
                    console.log("Receieved Token")
                    // convert token to base64
                    let token = Buffer.from(json.access_token).toString('base64');
                    resolve(token)
                }
            }).catch(err => {
                console.error(err);
                reject(err);
            }
            );
    });
}

// Run the onDemand test
async function runTest(token, testUrl, nodeId) {
    const ON_DEMAND_URL = `${ON_DEMAND_URI}/0`;    
    // Get actual test url instead of shortened t.co
    testUrl = await deShortenUrl(testUrl);
    return new Promise((resolve, reject) => {
        let postBodyString = `{"http_method":{"name":"GET","id":0},"id":0,"test_type":{"name":"Web","id":0},"monitor":{"id":2,"name":"Object"},"test_url":"${testUrl}","advanced_settings":{"additional_settings":{"capture_http_headers":false,"ignore_ssl_failures":false,"treat_40X_or_50X_http_response_as_successful_test_run":false}},"nodes":[{"name":"New York, US - Level3","id":${nodeId}}]}`
        fetch(ON_DEMAND_URL,
            {
                method: 'POST',
                body: postBodyString,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(json => {
                // response errors are set in the Message property of the response.
                if (json.hasOwnProperty('Message')) {
                    throw json.Message;
                } else {
                    console.log("Receieved onDemand Test Id")
                    resolve(json.id);
                }
            }).catch(err => {
                console.error(err);
                reject(err);
            }
            );
    })
}

// Get the data for the newly run test
async function getTestData(token, testId) {
    const ON_DEMAND_URL = `${ON_DEMAND_URI}/${testId}`;
    return new Promise((resolve, reject) => {
        fetch(ON_DEMAND_URL,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(json => {
                // response errors are set in the Message property of the response.
                if (json.hasOwnProperty('Message')) {
                    throw json.Message;
                } else {
                    console.log("Receieved Test Data")
                    resolve(json);
                }
            }).catch(err => {
                console.error(err);
                reject(err);
            }
            );
    })
}

// Map summary metric names with values
function convertData(structure) {
    if (structure != null) {
        let testParams = []
        let testMetricValues = []
        let solution = {}
        let summaryMetrics = structure.items[0]
        summaryMetrics.web.summary.fields.metrics.map((item) => {
            testParams.push(item.name);
        })
        summaryMetrics.web.summary.items.map((item) => {
            item.metrics.map((values) => {
                testMetricValues.push(values);
            })
        })
        for (let i = 0; i < testParams.length; i++) {
            solution[testParams[i]] = testMetricValues[i];
        }
        return solution;
    }
    else {
        console.log(structure)
        return ("No Data");
    }
}

// Wait for a certain duration before fetching the new instant test's data
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Driver code for CP onDemand test execution and data retrieval
async function getTestResult(testUrl, nodeId) {
    try {
        let token = await getToken(clientId, clientSecret);
        let testId = await runTest(token, testUrl, nodeId);
        await timeout(WAIT_TIME);
        // TODO return test success/failure, api polling for long running tests
        let testData = await getTestData(token, testId);
        let summaryMetrics = convertData(testData);
        console.log(summaryMetrics);
        return (summaryMetrics);
    }
    catch (err) {
        console.error(err);
        return 1;
    }
}

export { getTestResult };
var express = require('express');
var bodyParser = require('body-parser');
var CryptoJS = require("crypto-js");
var terminalArgs = process.argv.slice(2); // https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/

const axios = require('axios');
const jsonp = require('jsonp');
const { v1: uuidv1 } = require('uuid');
const config = require('./config.js');
const serverPort = 3000;

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use('/', express.static('public'))

// Post data config
var appKey = config.appKey;
try {
    var key = terminalArgs[0].toString();
} catch (e) {
    console.log("No appSecret found from command argument.");
    process.exit(1);
}
var from = 'en';
var to = 'zh-CHS';

async function requestYoudao(word) {
    // const requestYoudao = async (word) => {
    var salt = uuidv1(); // (new Date).getTime();
    var curtime = Math.round(new Date().getTime() / 1000);
    var curtime = curtime.toString();
    var str1 = appKey + truncate(word) + salt + curtime + key;
    var sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);

    return axios({
            method: 'post',
            url: 'https://openapi.youdao.com/api',
            params: {
                q: word,
                appKey: appKey,
                salt: salt,
                from: from,
                to: to,
                sign: sign,
                signType: "v3",
                curtime: curtime
            }
        })
        .then(res => res.data)
        .catch(err => console.error(err))
}

async function batchRequest(words) {
    console.log("[", (new Date), "] Processing words: ", words);

    var response_data = [];
    var responseJsonMeaning = [];

    for (var i = 0; i < words.length; i++) {
        // console.log(i);
        await requestYoudao(words[i])
            .then(response => {
                var result = response;
                response_data.push({
                    meaning: result,
                });
                if (response_data[i]["meaning"]["isWord"] == false) {
                    responseJsonMeaning[words[i]] = false;
                } else if (response_data[i]["meaning"]["isWord"] == true) {
                    responseJsonMeaning[words[i]] = response_data[i]["meaning"]["basic"]["explains"][0];
                }
            });
    }

    var result = [response_data, responseJsonMeaning]

    return result;
}

function truncate(q) {
    var len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
}

/*
  ____             _            
 |  _ \ ___  _   _| |_ ___ _ __ 
 | |_) / _ \| | | | __/ _ \ '__|
 |  _ < (_) | |_| | ||  __/ |   
 |_| \_\___/ \__,_|\__\___|_|   
                                
*/

app.post('/api', async (req, res, next) => {
    var allowedOrigins = ["http://localhost:3000"];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    var incoming_json = req.body["word"];
    var count = Object.keys(incoming_json).length;

    // console.log(incoming_json, count);

    try {
        var result = await batchRequest(incoming_json);
        var result_json = result[0];
        // var result_json = JSON.parse(JSON.stringify(Object.assign({}, result[1])));

        console.log("[", (new Date), "] Done processing all the words.", result_json);
        res.send(result_json);
    } catch (e) {
        console.log(e);
        res.send('Error');
    } finally {
        // console.log("Leaving... ");
    }
});

app.post('/api-txt', async (req, res, next) => {
    // console.log(req.is('text/*'));
    // console.log(req.is('json'));
    var response_txt_array = req.body;
    var response_txt_split = response_txt_array.split("\n");

    try {
        var result = await batchRequest(response_txt_split);
        var result_json = JSON.parse(JSON.stringify(Object.assign({}, result[1])));

        console.log("[", (new Date), "] Done processing all the words.", result_json);
        res.send(result_json);
    } catch (e) {
        console.log(e);
        res.send('Error');
    } finally {
        // console.log("Leaving... ");
    }
});



app.listen(serverPort, () => console.log('Server ready on:', serverPort));
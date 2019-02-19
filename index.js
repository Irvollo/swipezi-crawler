"use strict";
const Nightmare = require('nightmare');
const cheerio = require('cheerio');
const Twit = require('twit');
require('dotenv').config();

const config = {
/* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */
    twitter: {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    }
},
T = new Twit(config.twitter);

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('');
}

function exerciseOrder(sentences) {
    const nums = new Set();
    while(nums.size !== sentences.length) {
        nums.add(Math.floor(Math.random() * sentences.length));
    }
    console.log(nums);
    return nums;
}

function parsedSentences(sentences, order) {
    const orderSentences = [];
    sentences.map((sentence, index) => {
        const currenSentence = sentences[order[index]]
        // Set the random order
        orderSentences[index] = currenSentence;
    })
    return orderSentences;
}

function formTweet(sentences) {
    const options = ["A", "B", "C", "D", "E", "F", "G"]
    let newTweet = "Test your Chinese!\nReorder the conversation in the correct order:\n";
    const hashtags = "\n#HSK #LearnChinese #LearnMandarin #ChineseLanguage #China"
    sentences.map((sentence, index) => {
        newTweet = newTweet +  `${options[index]}) ${sentence.hanziSentence}\n`
    });
    return newTweet + hashtags;
}

function formAnswer(sentences, order){
    const options = ["A", "B", "C", "D", "E", "F", "G"]
    let newAnswer = "[Conversation Order]:\n\n";
    sentences.map((sentence, index) => {
        const currIndex = order[index];
        newAnswer = newAnswer + `${options[currIndex]}) ${sentences[currIndex].englishSentence}\n`
    })
    return newAnswer;
}

const nightmare = Nightmare({show: true});
const date = formatDate(new Date())
const query = "http://dict.naver.com/linedict/zhendict/#/cnen/todayexpr?data=" + date;

// Define the array where the sentences will be posted
const sentenceList = [];

// Request making using nightmare
nightmare
    .goto(query)
    .wait(3000)
    .wait('body')
    .wait(1500)
    .click('.btn_more')
    .wait(1000)
    .evaluate(() => document.querySelector('.dialogue.conver_lst').innerHTML) 
    .end()
    .then(response => {
        // Load
        const $ = cheerio.load(response);
        $('.txt').each(function(index, element) {
            sentenceList[index] = {};
            var hanziSentence = $(element).find($('.sent.org'));
            var pinyinSentence = $(element).find($('.pinyin'));
            var englishSentence = $(element).find($('.trans'));
            sentenceList[index]['hanziSentence'] = hanziSentence.text().replace('Listen', '').trim();
            sentenceList[index]['pinyinSentence'] = pinyinSentence.text().trim();
            sentenceList[index]['englishSentence'] = englishSentence.text().trim();
        })
    })
    .then(() => {
        const order = exerciseOrder(sentenceList);
        console.log('order', order);
        return Array.from(order);
    })
    .then((order) => {
        const randomizedSentences = parsedSentences(sentenceList, order);
        const tweet = formTweet(randomizedSentences);
        const answer = formAnswer(randomizedSentences, order);
        console.log(tweet);
        console.log(answer);
        T.post('statuses/update', { status: tweet }, function(err, data, response) {
            if (!err) {
                const twitId = data.id_str;
                console.log('Trying to reply to: ', twitId);

                setTimeout(() => {
                    T.post('statuses/update', { status: answer, in_reply_to_status_id: twitId, auto_populate_reply_metadata: true }, function(err, data, response) {
                        if (!err) {
                                console.log('Success!');
                        } else {
                            console.log(err);
                        }
                    })
                }, 2000)
            }
        })
    })
    .catch(err => {
        console.log(err);
    })


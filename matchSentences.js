const Nightmare = require('nightmare');
const cheerio = require('cheerio');
const Twit = require('twit');
var randomWords = require('random-words');

require('dotenv').config();

const config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */
    twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    }
};

const T = new Twit(config.twitter);

const word = randomWords();
const nightmare = Nightmare({show: false});
const query = `https://dict.naver.com/linedict/zhendict/#/cnen/example?query=${word}`;

// orders
function exerciseOrder(sentences) {
    const nums = new Set();
    while(nums.size !== sentences.length) {
        nums.add(Math.floor(Math.random() * sentences.length));
    }
    return Array.from(nums);
}

function parseTweet(sentenceList, order) {
    const options = ["A", "B", "C", "D"];
    const header = "Match the sentences!"
    let englishSentences  = ""
    let hanziSentences = ""
    sentenceList.map((sentence, index) => {
        const randomSentence = sentence.englishSentence;
        englishSentences = englishSentences + `\n${options[index]}) ${randomSentence}`;
    })
    sentenceList.map((sentence, index) => {
        const randomAnswer = sentenceList[order[index]].hanziSentence;
        hanziSentences = hanziSentences + `\n${index + 1}) ${randomAnswer}`;
    })

    const hashtags = "\n#Match #Chinese #LearnChinese #China"
    const tweet = `${header}\n${hanziSentences}\n${englishSentences}\n`;
    const hashtagsTweet = tweet + hashtags;
    if (hashtagsTweet.length >= 280) {
        return tweet;
    } else {
        return hashtagsTweet;
    }
}

function parseAnswer(senteceList, orderB) {
    const options = ["A", "B", "C"];
    let answers = "[Match Sentence Answer]:\n\n";
    console.log(orderB)
    senteceList.map((sentence, index) => {
        answers = answers + `${index + 1}-${options[orderB[index]]} (${sentenceList[orderB[index]].pinyinSentence})\n`       
    });
    return answers;
} 


// Define the array where the sentences will be posted
const sentenceList = [];

// Request making using nightmare
nightmare
    .goto(query)
    .wait(3000)
    .goto(query)
    .wait('body')
    .wait('.section_search')
    .wait('.srch_result')
    .wait(2000)
        .evaluate(() => document.querySelector('.example_lst').innerHTML)
    .end()
    .then(response => {
        const $ = cheerio.load(response);
        $('.exam').each(function(index, element) {
            let hanziSentence = "";
            $(element).find('.stc')
                .each((index, stcElement) => {
                    const currHanzi = $(stcElement).find($('.autolink')).text().trim();
                    hanziSentence = hanziSentence + currHanzi;
                });
            const pinyinSentence = $(element).find($('.pinyin')).text().trim();
            const englishSentence = $(element).find($('.trans')).text().trim();
            if (englishSentence.length > 50 || hanziSentence.length > 12 ) {return}
            const sentence = {pinyinSentence, englishSentence, hanziSentence} 
            sentenceList.push(sentence);   
        })
    })
    .then(() => {
        const sentencesUsed = sentenceList.slice(0,3);
        const senteceOrder = exerciseOrder(sentencesUsed);
        const tweet = parseTweet(sentencesUsed, senteceOrder);
        const answer = parseAnswer(sentencesUsed, senteceOrder);
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
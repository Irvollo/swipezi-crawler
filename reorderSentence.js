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
const nightmare = Nightmare({show: true});
const query = `https://dict.naver.com/linedict/zhendict/#/cnen/example?query=${word}`;

// orders
function exerciseOrder(sentences) {
    const nums = new Set();
    while(nums.size !== sentences.length) {
        nums.add(Math.floor(Math.random() * sentences.length));
    }
    return Array.from(nums);
}

function reorderSentence(order, sentence) {
    let reorderedSentence = [];
    sentence.map((char, index) => {
        const currOrder = order[index];
        const currChar = sentence[currOrder];
        reorderedSentence.push(currChar);
    })
    return reorderedSentence;
}

function parseTweet(english, sentence) {
    const options = ["A", "B", "C","D","E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
    const header = "Reorder the sentence!"
    let parsedSentence  = ""
    sentence.map((char, index) => {
        parsedSentence = parsedSentence + `${options[index]}) ${char} ${(index !== 0 && index % 4 === 0) ? '\n' : ''}`
    })
    
    const hashtags = "\n#Reorder #Chinese #LearnChinese #China"
    const tweet = `${header}\n\n[${english}]\n\n${parsedSentence}\n`;

    const hashtagsTweet = tweet + hashtags;
    if (hashtagsTweet.length >= 280) {
        return tweet;
    } else {
        return hashtagsTweet;
    }
}

function parseAnswer(sentence, order) {
    const options = ["A", "B", "C","D","E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
    let answers = "[Order Sentence Answer]:\n\n";
    console.log(order);
    order.map((orderIndex, index) => {
        answers = answers + `${options[order[index]]}(${sentence.hanziSentenceOrdered[index]})${index + 1 === order.length ? "" : "-"}` 
    });
    return `${answers}\n${sentence.pinyinSentence}`;
} 



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
        const sentences = [];
        $('.exam').each(function(index, element) {
            const hanziSentenceOrdered = [];
            $(element).find('.stc .autolink')
                .each((index, stcElement) => {
                    const currHanzi = $(stcElement).text().trim();
                    hanziSentenceOrdered.push(currHanzi);
                });
            const englishSentence = $(element).find($('.trans')).text().trim();
            const pinyinSentence = $(element).find($('.pinyin')).text().trim();
            sentences.push({hanziSentenceOrdered, englishSentence, pinyinSentence});
        })
        return sentences;
    })
    .then((sentences) => {
        const randomIndex = Math.floor(Math.random() * sentences.length)
        const randomSentence = sentences[randomIndex];
        const randomOrder = exerciseOrder(randomSentence.hanziSentenceOrdered);
        const reorderedSentence = reorderSentence(randomOrder, randomSentence.hanziSentenceOrdered);
        const tweet = parseTweet(randomSentence.englishSentence, reorderedSentence);
        const answer = parseAnswer(randomSentence, randomOrder);
        console.log(tweet);
        console.log(answer);
        /* T.post('statuses/update', { status: tweet }, function(err, data, response) {
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
        }) */
    })
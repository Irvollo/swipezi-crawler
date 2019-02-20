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


function exerciseOrder(sentences) {
    const nums = new Set();
    while(nums.size !== sentences.length) {
        nums.add(Math.floor(Math.random() * sentences.length));
    }
    return Array.from(nums);
}

function getExercise(sentence) {
    const options = ["A", "B", "C","D","E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
    const {hanziSentenceOrdered} = sentence;
    const order = exerciseOrder(hanziSentenceOrdered).slice(0,3);
    let test = ""
    let optionsText = ""
    hanziSentenceOrdered.map((char, index) => {
        const currentRandomIndex = order[index];
        const shouldRender = order.indexOf(index) < 0;
        if (index + 1 <= order.length) {
            optionsText = optionsText + `${options[index]})${hanziSentenceOrdered[currentRandomIndex]} `
        }
        test = test + `${shouldRender ? char : ' _ '}`
    });
    return {test, optionsText, order};
}

function parseTweet(exercise, sentence) {
    const header = "Fill the gap!"
    const hashtags = "#FillTheGap #Chinese #LearnChinese #China"
    const tweet = `${header}\n[${sentence.englishSentence}]\nOptions:\n${exercise.optionsText}\n\n${exercise.test}\n${hashtags}`;
    return tweet;
}

function parseAnswer(sentence, exercise) {
    const options = ["A", "B", "C","D","E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
    let answers = "[Fill the Gap Answer]:\n";
    let render = "";
    sentence.hanziSentenceOrdered.map((char, index) => {
        const shouldRenderAsAnswer = exercise.order.indexOf(index) > - 1; 
        const answerIndex = exercise.order.indexOf(index);
        render = render + (shouldRenderAsAnswer ? `(${options[answerIndex]}/${char})` : `${char}`);
    });
    return `${answers}\n${render}\n[${sentence.pinyinSentence}]\n`;
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
        const exercise = getExercise(randomSentence);
        const tweet = parseTweet(exercise, randomSentence);
        const answer = parseAnswer(randomSentence, exercise);
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
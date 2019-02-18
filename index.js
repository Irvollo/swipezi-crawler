const Nightmare = require('nightmare');
const cheerio = require('cheerio');

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
    let newTweet = "Test your Chinese!\nReorder the sentences in the correct order: \n\n";
    const hashtags = "\n#HSK #LearnChinese #LearnMandarin #ChineseLanguage #China"
    sentences.map((sentence, index) => {
        newTweet = newTweet +  `${index + 1}) ${sentence.hanziSentence}\n`
    });
    return newTweet + hashtags;
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
        console.log(tweet);
    })
    .catch(err => {
        console.log(err);
    })


var UnfamiliarExtent;
(function (UnfamiliarExtent) {
    UnfamiliarExtent[UnfamiliarExtent["VerUnfamiliar"] = 0] = "VerUnfamiliar";
    UnfamiliarExtent[UnfamiliarExtent["Unfamiliar"] = 1] = "Unfamiliar";
})(UnfamiliarExtent || (UnfamiliarExtent = {}));
function readPage3CollinsContentWorkFunction() {
    let wordName = document.querySelector(Page3WordNameDiv);
    let res = new Word(wordName.innerText);
    let collinsMeaningArray = document.querySelector('.CollinsTrans_paraphraseList__3SZ3y');
    if (collinsMeaningArray === null)
        return res;
    else {
        //collins 词典获取
        collinsMeaningArray.childNodes.forEach(node => {
            const newNode = node;
            //获取柯林斯词典的释义
            let tmp = {
                wordType: '',
                wordMeaning: [],
                exampleSentence: ''
            };
            let list = newNode.innerText.split(/\.|;/);
            tmp.wordType = list[0];
            tmp.exampleSentence = list[1];
            tmp.wordMeaning = list.slice(2);
            res.wordMeaning.push(tmp);
        });
        //获取六级真题例句
        document.querySelectorAll(Cet6ExampleSentence).forEach((item) => {
            const source = item.querySelector(sentenceSource);
            //这个判断句子中是不是带有六级关键词，如果是，那么获取这个句子
            if (Cet6.test(source.innerText)) {
                let tmp_Cet6 = {
                    wordType: '',
                    wordMeaning: [],
                    sentenceEn: '',
                    sentenceCN: ''
                };
                const wordMeaning = "div.index_name__1gkfJ";
                const sentenceEn = "div.index_sentenceEn__1Qjgx";
                const sentenceCN = "div.index_sentenceCn__XJD1u";
                let wordMeaningHtml = item.querySelector(wordMeaning);
                let sentenceEnHtml = item.querySelector(sentenceEn);
                let sentenceCNHtml = item.querySelector(sentenceCN);
                const regex_wordMeaning = /^(\w+)\.(.+)$/;
                let wordMeaningMatch = wordMeaningHtml.innerText.match(regex_wordMeaning);
                if (wordMeaningMatch !== null) {
                    tmp_Cet6.wordType = wordMeaningMatch[1];
                    tmp_Cet6.wordMeaning.push(wordMeaningMatch[2]);
                }
                tmp_Cet6.sentenceCN = sentenceCNHtml.innerText;
                tmp_Cet6.sentenceEn = sentenceEnHtml.innerText;
                res.Cet6.push(tmp_Cet6);
            }
        });
    }
    return res;
}
const DBName = "WordNoteBook";
class WordNoteBook {
    constructor() {
        const request = window.indexedDB.open(DBName, 1);
        request.onerror = function (event) {
            console.log("无法打开数据库");
        };
        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log("数据库已成功打开");
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("words")) {
                const objectStore = db.createObjectStore("words", {
                    keyPath: "wordName",
                });
                objectStore.createIndex("wordName", "wordName", { unique: true });
            }
            console.log("数据库版本已更新");
        };
    }
    queryWord(word, callback) {
        const transaction = this.db.transaction("words", "readonly");
        const objectStore = transaction.objectStore("words");
        const request = objectStore.get(word.wordName);
        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result) {
                console.log("查询到的数据:", result);
                callback(result);
            }
            else {
                console.log("未找到匹配的数据");
                callback(null);
            }
        };
        request.onerror = function (event) {
            console.log("查询数据时出错");
            callback(null);
        };
    }
    insertOrUpdateWord(word) {
        const transaction = this.db.transaction("words", "readwrite");
        const objectStore = transaction.objectStore("words");
        const request = objectStore.put(word);
        request.onsuccess = (event) => {
            console.log("单词已成功插入或更新");
        };
        request.onerror = function (event) {
            console.log("插入或更新单词时出错");
        };
    }
}
class Word {
    //记录单词
    constructor(wordName) {
        this.forgetTime = 0;
        this.reviewTime = 4;
        this.note = '';
        this.curIndex = 0;
        this.wordName = wordName;
        this.wordMeaning = [];
        this.Cet6 = [];
    }
    //记录对单词的熟悉程度的，一般不熟悉+3，非常不熟悉（之前背过很多次，但还是忘记了的那就是非常不熟悉) 
    addForgetTime() {
        this.forgetTime += 1;
        this.reviewTime = 4;
        this.curIndex = 0;
    }
    //返回遗忘次数
    getForgetTime() {
        return this.forgetTime;
    }
    getReviewTime() {
        return this.reviewTime;
    }
    setReviewTime(times) {
        this.reviewTime = times;
    }
    decreaseReviewTime() {
        //复习三次之后我们就不再复习
        if (this.curIndex > 2) {
            return -10000;
        }
        this.reviewTime -= 1;
        let reviewArray = [{ '-2': 1 }, { '-2': 1 }, { '-3': 2 }];
        let keyValuePairs = Object.entries(reviewArray[this.curIndex]);
        if (this.reviewTime === Number(keyValuePairs[0][0])) {
            this.reviewTime = keyValuePairs[0][1];
            this.curIndex += 1;
        }
    }
    init(word) {
        this.wordMeaning = word.wordMeaning;
        this.Cet6 = word.Cet6;
        this.forgetTime = word.forgetTime;
        this.reviewTime = 4;
        this.note = word.note;
        this.curIndex = 0;
    }
}
class WordManager {
    constructor() {
        this.shouldAddCurWord = false;
        this.shouldRefreshWordQueue = false;
        this.shouldRemoveLastWord = false;
        this.shouldRefreshCurWord = true;
        this.isReadyToGetWords = false;
        //
        this.curWord = new Word('default');
        this.lastWord = new Word('default');
        this.noteBook = new WordNoteBook();
        this.newArray = [];
    }
    refreshCurWord(word) {
        if (!this.shouldRefreshCurWord)
            return;
        this.lastWord = this.curWord;
        this.noteBook.queryWord(word, res => {
            console.log('WordManager refreshCurWord 查询单词中 ', word.wordName);
            if (res) {
                console.log('WordManager refreshCurWord 查询到该单词 其笔记为 ', res.note);
                this.curWord = new Word(res.wordName);
                this.curWord.init(res);
            }
            else {
                console.log('WordManager refreshCurWord 未查询到该单词，插入该单词');
                this.noteBook.insertOrUpdateWord(word);
                this.curWord = word;
            }
            this.isReadyToGetWords = true;
        });
        //如果该移除这个单词，那么就移除这个单词
        this.removeLastWord();
        this.shouldRefreshCurWord = false;
    }
    removeLastWord() {
        if (!this.shouldRemoveLastWord)
            return;
        const index = this.newArray.findIndex(word => word.wordName === this.lastWord.wordName);
        if (index !== -1) {
            let word = this.newArray.splice(index, 1)[0];
            console.log('WordManager removeLastWord 移除单词成功: ', word.wordName);
        }
        else {
            console.log('WordManager removeLastWord 该单词不存在，移除失败');
        }
        this.shouldRemoveLastWord = false;
    }
    addCurWord() {
        //该添加单词就添加，不该添加单词那么就直接返回
        if (!this.shouldAddCurWord)
            return;
        this.noteBook.queryWord(this.curWord, res => {
            if (res) {
                console.log('WordManager addCurWord 数据库中查到该单词，添加到数据库中');
                const index = this.newArray.findIndex((item) => item.wordName === this.curWord.wordName);
                //这个单词是存在的，增加遗忘度，单词遗忘次数+1
                if (index !== -1) {
                    this.newArray[index].addForgetTime();
                    this.noteBook.insertOrUpdateWord(this.newArray[index]);
                }
                else {
                    let word = new Word(res.wordName);
                    word.init(res);
                    this.newArray.unshift(word);
                }
            }
            else {
                console.log("WordManager addCurWord 没有查到该单词，查询失败，请检查刷新单词函数");
            }
        });
        this.shouldAddCurWord = false;
    }
    addCurWordNote() {
        let res = prompt('笔记', this.curWord.note);
        if (res) {
            const index = this.newArray.findIndex((item) => item.wordName === this.curWord.wordName);
            if (index !== -1) {
                this.newArray[index].note = res;
                this.noteBook.insertOrUpdateWord(this.newArray[index]);
            }
            else {
                this.curWord.note = res;
                this.noteBook.insertOrUpdateWord(this.curWord);
            }
        }
    }
    getReviewQueue() {
        let reviewQueue = [];
        reviewQueue.push(this.curWord);
        this.newArray.forEach(item => {
            reviewQueue.push(item);
        });
        return reviewQueue;
    }
    static getWordManager() {
        return this.singleton;
    }
}
WordManager.singleton = new WordManager();
const UnFamiliarDiv = ".index_option__1CVr2.index_red__VSPTN";
const FamiliarDiv = ".index_option__1CVr2.index_green__2lFgU";
const WordNameDiv = ".index_word__3nhJU";
const Cet6 = /六级/;
const Cet6ExampleSentence = ".index_exemplarySentenceDetail__2Cq1p";
const Page3WordNameDiv = '.VocabPronounce_word__17Tma';
const sentenceSource = ".index_from__6aBoj";
const refereshTime = 250;
const progressBar = ".index_progress__1aCBt";
const reViewPage = ".StudySummary_studySummary__32y_I";
const studyPage = "div.StudyPage_studyPage__1Ri5C";
class Page1Events {
    constructor() {
        this.isRegister = false;
        this.page1ClickUnKnowEvent = () => {
            WordManager.getWordManager().shouldAddCurWord = true;
            this.removeEvents();
        };
        this.page1ClickKnowEvent = () => {
            this.removeEvents();
        };
        this.page1Key1DownEvent = (e) => {
            if (e.key === '1') {
                this.page1ClickKnowEvent();
            }
        };
        this.page1Key2DownEvent = (e) => {
            if (e.key === '2') {
                this.page1ClickUnKnowEvent();
            }
        };
    }
    registerEvents() {
        if (!this.isRegister) {
            let btnFamiliar = document.querySelector(FamiliarDiv);
            let btnUnFamiliar = document.querySelector(UnFamiliarDiv);
            btnFamiliar === null || btnFamiliar === void 0 ? void 0 : btnFamiliar.addEventListener('click', this.page1ClickKnowEvent);
            btnUnFamiliar === null || btnUnFamiliar === void 0 ? void 0 : btnUnFamiliar.addEventListener('click', this.page1ClickUnKnowEvent);
            document.addEventListener('keydown', this.page1Key1DownEvent);
            document.addEventListener('keydown', this.page1Key2DownEvent);
            console.log('页面1事件注册成功');
        }
        this.isRegister = true;
    }
    removeEvents() {
        if (this.isRegister) {
            document.removeEventListener('keydown', this.page1Key1DownEvent);
            document.removeEventListener('keydown', this.page1Key2DownEvent);
            this.isRegister = false;
            console.log('页面1事件移除成功');
        }
    }
    receiveChanges(page) {
        if (page === 1 && !this.isRegister) {
            this.registerEvents();
        }
        else {
            this.removeEvents();
        }
    }
}
class Page3Events {
    constructor() {
        this.isRegister = false;
        this.isNoted = false;
        this.Page3Key2DownEvent = (e) => {
            if (e.key === '2') {
                WordManager.getWordManager().shouldAddCurWord = true;
            }
        };
        this.Page3ArrowRighrtDown = (e) => {
            if (e.key === 'ArrowRight') {
                console.log('--> 触发');
                this.removeEvents();
                //在离开的时候决定是否加入当前单词
                WordManager.getWordManager().addCurWord();
            }
        };
        // Page3ArrowRighrtDown(self: Page3Events) {
        //     return 
        // }
        this.Page3WDownEvent = (e) => {
            if (e.key === "w") {
                WordManager.getWordManager().addCurWordNote();
            }
        };
    }
    removeEvents() {
        if (this.isRegister) {
            document.removeEventListener('keydown', this.Page3Key2DownEvent);
            document.removeEventListener('keydown', this.Page3ArrowRighrtDown);
            document.removeEventListener('keydown', this.Page3WDownEvent);
            this.isRegister = false;
            this.isNoted = false;
            console.log('页面3事件移除成功');
            WordManager.getWordManager().shouldRefreshCurWord = true;
        }
    }
    registerEvents() {
        //这一行代码是刷新页面用的，后面要做优化
        // this.self.words.isChanged = true
        if (!this.isRegister) {
            document.addEventListener('keydown', this.Page3Key2DownEvent);
            document.addEventListener('keydown', this.Page3ArrowRighrtDown);
            document.addEventListener('keydown', this.Page3WDownEvent);
            this.isRegister = true;
            console.log('页面3事件注册成功');
        }
    }
    receiveChanges(page) {
        if (page === 3 && !this.isRegister) {
            this.registerEvents();
        }
        else {
            this.removeEvents();
        }
    }
}
class PageMainWindowEvents {
    constructor() {
        this.isRegister = false;
        //move back
        this.keyNDownEvents = (e) => {
            if (e.key === "n") {
                console.log('n 触发');
                MainWindow.getMainWindow().moveBack();
            }
        };
        this.keyMDownEvents = (e) => {
            if (e.key === "m") {
                console.log('m 触发');
                MainWindow.getMainWindow().moveForWard();
            }
        };
    }
    registerEvents() {
        document.addEventListener('keyup', this.keyMDownEvents);
        document.addEventListener('keyup', this.keyNDownEvents);
        console.log("主页面事件注册成功");
    }
    removeEvents() {
        document.removeEventListener('keyup', this.keyMDownEvents);
        document.removeEventListener('keyup', this.keyNDownEvents);
        console.log("主页面事件移除成功");
    }
    receiveChanges(page) {
        if (page === 3) {
            if (!this.isRegister) {
                this.registerEvents();
                this.isRegister = true;
            }
        }
        else {
            if (this.isRegister) {
                this.removeEvents();
                this.isRegister = false;
            }
        }
    }
}
//观察鼠标 键盘事件，并做出对应的反馈
class Observer {
    constructor() {
        //members for page change detection
        this.curPage = -1;
        this.isPageChanged = false;
        this.fans = [];
        //members for progress change detection
        this.finishedCount = 0;
        this.unFinishedCount = 0;
        this.forgetWordCount = 0;
        this.words = WordManager.getWordManager();
        this.window = MainWindow.getMainWindow();
        let Page1Eventshandler = new Page1Events();
        let Page3EventsHandler = new Page3Events();
        let pageMainWindowHandler = new PageMainWindowEvents();
        this.followChange(pageMainWindowHandler);
        this.followChange(Page1Eventshandler);
        this.followChange(Page3EventsHandler);
    }
    followChange(page) {
        this.fans.push(page);
        console.log('subject success!');
    }
    startMonitor() {
        setInterval(() => {
            //监测页面变化
            this.queryCurPage();
            //监测进度条变化
            this.queryProgressChange();
        }, refereshTime);
    }
    //这个是查询所在页面的
    queryCurPage() {
        let curPage_tmp = this.curPage;
        //页面判别逻辑
        //在页面1 ,否则在页面3
        let btnUnfamiliar = document.querySelector(UnFamiliarDiv);
        if (btnUnfamiliar !== null)
            this.curPage = 1;
        else
            this.curPage = 3;
        let rvwpag = document.querySelector(reViewPage);
        if (rvwpag)
            this.curPage = 4;
        //如果页面改变，那么就通知注册事件，避免多次重复的通知
        if (curPage_tmp !== this.curPage)
            this.isPageChanged = true;
        if (this.isPageChanged) {
            this.fans.forEach(item => {
                item.receiveChanges(this.curPage);
            });
            //如果当前是在页面3 那么就将curWord刷新为当前单词
            if (this.curPage === 3)
                this.words.refreshCurWord(readPage3CollinsContentWorkFunction());
            this.window.queryWordsIsReady(this.curPage);
            this.isPageChanged = false;
        }
    }
    //这个是刷新进度条 记录单词是否移除的
    queryProgressChange() {
        let progressHtml = document.querySelector(progressBar);
        // 如果不在page1，返回
        if (progressHtml == null)
            return;
        // 获取子元素
        let divElements = progressHtml.querySelectorAll('div');
        // 初始化变量
        let finished = 0;
        let unfinished = 0;
        let forget = 0;
        // 遍历子元素并获取数字
        for (let i = 0; i < divElements.length; i++) {
            let textContent = divElements[i].textContent;
            if (textContent !== null) {
                let number = parseInt(textContent);
                let style = divElements[i].getAttribute('style');
                // 根据style属性值将数字分类
                if (style === null || style === void 0 ? void 0 : style.includes('background-color: rgb(32, 158, 133)')) {
                    finished = number;
                }
                else if (style === null || style === void 0 ? void 0 : style.includes('background-color: rgb(245, 245, 245)')) {
                    unfinished = number;
                }
                else if (style === null || style === void 0 ? void 0 : style.includes('background-color: rgb(248, 148, 6)')) {
                    forget = number;
                }
            }
        }
        if (forget - this.forgetWordCount < 0) {
            console.log('remove Wrod triggered');
            this.words.shouldRemoveLastWord = true;
        }
        this.finishedCount = finished;
        this.unFinishedCount = unfinished;
        this.forgetWordCount = forget;
    }
}
class CardWidget {
    constructor(word) {
        this.Html = `<div class="wordCard">
        ${this.getCardHeader(word)}
        ${this.getNote(word)}
        ${this.getMeaningHtml(word)}
        ${this.getCet6ExampleSentence(word)}
        ${this.getForgetTimeHtml(word)}
    </div>`;
    }
    getNote(word) {
        if (word.note === '')
            return '';
        else
            return `<p id = "wordNote">
            ${word.note}
        </p>`;
    }
    getCardHeader(word) {
        return `<p class = "wordName">
        ${word.wordName}
    </p>`;
    }
    getMeaningHtml(word) {
        function generatreLi(tmp) {
            let type = tmp.wordType;
            let Meaning = '';
            tmp.wordMeaning.forEach(item => {
                Meaning += item;
                Meaning += " ";
            });
            let body = `<li>
            <div>
            <p>${type}. ${Meaning}</p>
            <p>${tmp.exampleSentence}<p>
            </div>
            </li>`;
            return body;
        }
        let li_s = '';
        word.wordMeaning.forEach(item => {
            li_s += generatreLi(item);
        });
        return `
        <div>
        <ol>
         ${li_s}  
        </ol>
    </div>
        `;
    }
    getCet6ExampleSentence(word) {
        if (word.Cet6.length == 0)
            return '';
        function gennerateLi(tmp) {
            return `<p>${tmp.sentenceEn}</p>
            <p>${tmp.sentenceCN}</p>
            `;
        }
        let body = '';
        word.Cet6.forEach(item => {
            body += gennerateLi(item);
        });
        return `<div>
        ${body}
        </div>`;
    }
    getForgetTimeHtml(word) {
        return `<span>遗忘次数: ${word.getForgetTime()}</span>`;
    }
    getHtml() {
        return this.Html;
    }
}
class MainWindow {
    static getMainWindow() {
        return this.singleton;
    }
    constructor() {
        this.showed = false;
        this.created = false;
        this.self = this;
        this.curIndex = 0;
        this.reviewQueue = [];
        this.stateBox = `<p class="stateBox">当前需背单词
    <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
    目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`;
        this.Html = "null";
        this.widget = document.createElement('div');
        this.widget.id = "mainBody";
    }
    createWidget() {
        var _a;
        if (!this.created) {
            (_a = document.querySelector(studyPage)) === null || _a === void 0 ? void 0 : _a.appendChild(this.widget);
            if (document.getElementById("mainBody") !== null)
                this.created = true;
        }
    }
    queryWordsIsReady(page) {
        if (page === 3) {
            const self = this; // Save reference to MainWindow instance
            function work() {
                let words = WordManager.getWordManager();
                console.log('MainWindow queryWordsIsReady work');
                if (words.isReadyToGetWords) {
                    words.isReadyToGetWords = false;
                    self.reviewQueue = words.getReviewQueue(); // Use self instead of this
                    self.show(); // Use self instead of this
                    clearInterval(timer);
                    console.log('MainWindow queryWordsIsReady work out!!!!!');
                }
            }
            let timer = setInterval(work, 500);
        }
        else {
            this.curIndex = 0;
            this.widget.style.visibility = "hidden";
        }
    }
    //根据当前页面决定是否需要展示
    show() {
        this.self.createWidget();
        this.stateBox = `<p class="stateBox">当前需背单词
        <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
        目前索引<span style="color: #28bea0;">${this.curIndex + 1}</span></p>`;
        if (this.reviewQueue.length !== 0)
            this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex]);
        else
            this.widget.innerHTML = this.stateBox;
        this.widget.style.visibility = "visible";
    }
    generatreCard(word) {
        let card = new CardWidget(word);
        return card.getHtml();
    }
    moveForWard() {
        if (this.reviewQueue.length === 0)
            return;
        this.curIndex++;
        if (this.curIndex === this.reviewQueue.length)
            this.curIndex = 0;
        this.stateBox = `<p class="stateBox">当前需背单词
            <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
            目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`;
        this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex]);
    }
    moveBack() {
        if (this.reviewQueue.length === 0)
            return;
        this.stateBox = `<p class="stateBox">当前需背单词
            <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
            目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`;
        this.curIndex--;
        if (this.curIndex < 0)
            this.curIndex = this.reviewQueue.length - 1;
        this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex]);
    }
}
MainWindow.singleton = new MainWindow();
class Server {
    constructor() {
        this.observer = new Observer();
    }
    start() {
        this.observer.startMonitor();
    }
}
function main() {
    let server = new Server();
    setTimeout(() => {
        alert('加载成功');
        server.start();
    }, 3000);
}
main();

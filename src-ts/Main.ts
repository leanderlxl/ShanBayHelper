
enum UnfamiliarExtent {
    VerUnfamiliar = 0,
    Unfamiliar = 1
}

type WordInterpretation = {
    exampleSentence: string,
    wordMeaning: string[]
    wordType: string
};

interface Review {
    [key: string]: number;
}

function readPage3CollinsContentWorkFunction(): Word {
    let wordName = document.querySelector(Page3WordNameDiv) as HTMLElement
    let res: Word = new Word(wordName.innerText)
    let collinsMeaningArray = document.querySelector('.CollinsTrans_paraphraseList__3SZ3y') as HTMLElement
    if (collinsMeaningArray === null) return res
    else {
        //collins 词典获取
        collinsMeaningArray.childNodes.forEach(node => {
            const newNode = node as HTMLElement

            //获取柯林斯词典的释义
            let tmp: WordInterpretation = {
                wordType: '',
                wordMeaning: [],
                exampleSentence: ''
            };
            let list = newNode.innerText.split(/\.|;/)
            tmp.wordType = list[0]
            tmp.exampleSentence = list[1]
            tmp.wordMeaning = list.slice(2);
            res.wordMeaning.push(tmp)
        })
        //获取六级真题例句
        document.querySelectorAll(Cet6ExampleSentence).forEach((item) => {
            const source = item.querySelector(sentenceSource) as HTMLElement
            //这个判断句子中是不是带有六级关键词，如果是，那么获取这个句子
            if (Cet6.test(source.innerText)) {
                let tmp_Cet6: CET6Sentence = {
                    wordType: '',
                    wordMeaning: [],
                    sentenceEn: '',
                    sentenceCN: ''
                };
                const wordMeaning = "div.index_name__1gkfJ"
                const sentenceEn = "div.index_sentenceEn__1Qjgx"
                const sentenceCN = "div.index_sentenceCn__XJD1u"

                let wordMeaningHtml = item.querySelector(wordMeaning) as HTMLElement
                let sentenceEnHtml = item.querySelector(sentenceEn) as HTMLElement
                let sentenceCNHtml = item.querySelector(sentenceCN) as HTMLElement

                const regex_wordMeaning = /^(\w+)\.(.+)$/
                let wordMeaningMatch = wordMeaningHtml.innerText.match(regex_wordMeaning)
                if (wordMeaningMatch !== null) {
                    tmp_Cet6.wordType = wordMeaningMatch[1]
                    tmp_Cet6.wordMeaning.push(wordMeaningMatch[2])
                }

                tmp_Cet6.sentenceCN = sentenceCNHtml.innerText
                tmp_Cet6.sentenceEn = sentenceEnHtml.innerText
                res.Cet6.push(tmp_Cet6)

            }
        })
    }
    return res
}

// function saveWordsToFile() {
//     const wordManager = WordManager.getWordManager();
//     const words = wordManager.finishedArray.map(word => ({
//         wordName: word.wordName,
//         wordMeaning: word.wordMeaning,
//         Cet6: word.Cet6,
//         forgetTime: word.forgetTime,
//         note: word.note
//     }));

//     const jsonData = JSON.stringify(words);
//     const today = new Date();
//     const year = today.getFullYear();
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const day = String(today.getDate()).padStart(2, '0');
//     const filename = `wordsData_${year}.${month}.${day}.json`;

//     const element = document.createElement('a');
//     element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonData));
//     element.setAttribute('download', filename);
//     element.style.display = 'none';
//     document.body.appendChild(element);

//     element.click();

//     document.body.removeChild(element);
// }

type CET6Sentence = {
    wordType: string,
    wordMeaning: string[],
    sentenceEn: string,
    sentenceCN: string
}



const DBName = "WordNoteBook";

class WordNoteBook {
    db: IDBDatabase

    constructor() {
        const request: IDBOpenDBRequest = window.indexedDB.open(DBName, 1);

        request.onerror = function (event) {
            console.log("无法打开数据库");
        };

        request.onsuccess = (event) => {
            this.db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
            console.log("数据库已成功打开");
        };

        request.onupgradeneeded = (event) => {
            const db: IDBDatabase = (event.target as IDBOpenDBRequest).result as IDBDatabase;

            if (!db.objectStoreNames.contains("words")) {
                const objectStore = db.createObjectStore("words", {
                    keyPath: "wordName",
                });

                objectStore.createIndex("wordName", "wordName", { unique: true });
            }

            console.log("数据库版本已更新");
        };
    }

    queryWord(word: Word, callback: (result: Word | null) => void): void {
        const transaction: IDBTransaction = this.db.transaction("words", "readonly");
        const objectStore: IDBObjectStore = transaction.objectStore("words");
        const request: IDBRequest = objectStore.get(word.wordName);

        request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            if (result) {
                console.log("查询到的数据:", result);
                callback(result as Word);
            } else {
                console.log("未找到匹配的数据");
                callback(null);
            }
        };

        request.onerror = function (event) {
            console.log("查询数据时出错");
            callback(null);
        };
    }

    insertOrUpdateWord(word: Word) {
        const transaction: IDBTransaction = this.db.transaction("words", "readwrite");
        const objectStore: IDBObjectStore = transaction.objectStore("words");
        
        const request: IDBRequest = objectStore.put(word);

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
    public constructor(wordName: string) {
        this.wordName = wordName
        this.wordMeaning = []
        this.Cet6 = []
    }

    //记录对单词的熟悉程度的，一般不熟悉+3，非常不熟悉（之前背过很多次，但还是忘记了的那就是非常不熟悉) 
    public addForgetTime() {
        this.forgetTime += 1
        this.reviewTime = 4
        this.curIndex = 0
    }

    //返回遗忘次数
    public getForgetTime(): number {
        return this.forgetTime
    }

    public getReviewTime(): number {
        return this.reviewTime
    }

    public setReviewTime(times: number) {
        this.reviewTime = times
    }

    public decreaseReviewTime() {
        //复习三次之后我们就不再复习
        if (this.curIndex > 2) {
            return -10000
        }

        this.reviewTime -= 1

        let reviewArray = [{ '-2': 1 }, { '-2': 1 }, { '-3': 2 }];
        let keyValuePairs = Object.entries(reviewArray[this.curIndex]);
        if (this.reviewTime === Number(keyValuePairs[0][0])) {
            this.reviewTime = keyValuePairs[0][1]
            this.curIndex += 1
        }

    }

    public init(word:any)
    {
        this.wordMeaning = word.wordMeaning
        this.Cet6 = word.Cet6
        this.forgetTime = word.forgetTime
        this.reviewTime = 4
        this.note = word.note
        this.curIndex = 0
    }
    //members
    wordName: string
    wordMeaning: WordInterpretation[]
    Cet6: CET6Sentence[]
    forgetTime: number = 0;
    reviewTime: number = 4;
    note: string = ''
    curIndex: number = 0
}

class WordManager {
    static singleton: WordManager = new WordManager()
    shouldAddCurWord: boolean = false
    shouldRefreshWordQueue: boolean = false
    shouldRemoveLastWord:boolean = false
    shouldRefreshCurWord:boolean = true
    isReadyToGetWords:boolean = false
    //
    curWord: Word = new Word('default')
    lastWord: Word = new Word('default')

    //members
    newArray: Word[]



    noteBook: WordNoteBook = new WordNoteBook()

    private constructor() {
        this.newArray = []
    }

    public refreshCurWord(word: Word) {
        if(!this.shouldRefreshCurWord)return


        this.lastWord = this.curWord


        this.noteBook.queryWord(word, res=>{
            console.log('WordManager refreshCurWord 查询单词中 ',word.wordName)
            if(res)
            {
                console.log('WordManager refreshCurWord 查询到该单词 其笔记为 ' ,res.note)
                this.curWord = new Word(res.wordName)
                this.curWord.init(res)
            }
            else{
                console.log('WordManager refreshCurWord 未查询到该单词，插入该单词')
                this.noteBook.insertOrUpdateWord(word)
                this.curWord = word
            }
            this.isReadyToGetWords = true
        })

        //如果该移除这个单词，那么就移除这个单词
        this.removeLastWord()
        this.shouldRefreshCurWord = false
    }

    public removeLastWord() {
        if(!this.shouldRemoveLastWord) return
        const index = this.newArray.findIndex(word => word.wordName === this.lastWord.wordName);
        if (index !== -1) {
            let word =  this.newArray.splice(index, 1)[0];
            console.log('WordManager removeLastWord 移除单词成功: ',word.wordName)
        }
        else{
            console.log('WordManager removeLastWord 该单词不存在，移除失败')
        }
        this.shouldRemoveLastWord = false
    }

    public addCurWord() {
        //该添加单词就添加，不该添加单词那么就直接返回
        if (!this.shouldAddCurWord) return;

        this.noteBook.queryWord(this.curWord, res => {
            if (res) {
                console.log('WordManager addCurWord 数据库中查到该单词，添加到数据库中')
                const index = this.newArray.findIndex((item) => item.wordName === this.curWord.wordName);
                //这个单词是存在的，增加遗忘度，单词遗忘次数+1
                if (index !== -1) {
                    this.newArray[index].addForgetTime();
                    this.noteBook.insertOrUpdateWord(this.newArray[index])
                } else {
                    let word = new Word(res.wordName)
                    word.init(res)
                    this.newArray.unshift(word)
                }
            }else{
                console.log("WordManager addCurWord 没有查到该单词，查询失败，请检查刷新单词函数")
            }
        })

        

        this.shouldAddCurWord = false;
    }

    public addCurWordNote()
    {
        let res = prompt('笔记',this.curWord.note)
        if(res)
        {
            const index = this.newArray.findIndex(
                (item) => item.wordName === this.curWord.wordName);
            if(index !== -1)
            {
                this.newArray[index].note = res
                this.noteBook.insertOrUpdateWord(this.newArray[index])
            }
            else{
                this.curWord.note = res
                this.noteBook.insertOrUpdateWord(this.curWord)
            }
        }
    }

    public getReviewQueue(): Word[] {
        let reviewQueue: Word[] = []
        reviewQueue.push(this.curWord)
        this.newArray.forEach(item => {
                reviewQueue.push(item)
        })
        return reviewQueue
    }

    public static getWordManager() {
        return this.singleton
    }

}





const UnFamiliarDiv = ".index_option__1CVr2.index_red__VSPTN"
const FamiliarDiv = ".index_option__1CVr2.index_green__2lFgU"
const WordNameDiv = ".index_word__3nhJU"
const Cet6 = /六级/
const Cet6ExampleSentence = ".index_exemplarySentenceDetail__2Cq1p"
const Page3WordNameDiv = '.VocabPronounce_word__17Tma'
const sentenceSource = ".index_from__6aBoj"
const refereshTime = 250
const progressBar = ".index_progress__1aCBt"
const reViewPage = ".StudySummary_studySummary__32y_I"
const studyPage = "div.StudyPage_studyPage__1Ri5C"
//负责注册管理相关的事件
interface PageEvents {
    registerEvents(): void
    removeEvents(): void
    receiveChanges(page: number): void
}

class Page1Events implements PageEvents {

    isRegister: boolean = false
    registerEvents(): void {

        if (!this.isRegister) {
            let btnFamiliar = document.querySelector(FamiliarDiv)
            let btnUnFamiliar = document.querySelector(UnFamiliarDiv)
            btnFamiliar?.addEventListener('click', this.page1ClickKnowEvent)
            btnUnFamiliar?.addEventListener('click', this.page1ClickUnKnowEvent)

            document.addEventListener('keydown', this.page1Key1DownEvent)
            document.addEventListener('keydown', this.page1Key2DownEvent)
            console.log('页面1事件注册成功')
            
        }

        this.isRegister = true
    }

    removeEvents(): void {
        if (this.isRegister) {
            document.removeEventListener('keydown', this.page1Key1DownEvent)
            document.removeEventListener('keydown', this.page1Key2DownEvent)
            this.isRegister = false
            console.log('页面1事件移除成功')
        }
    }

    public receiveChanges(page: number): void {
        if (page === 1 && !this.isRegister) {
            
            this.registerEvents()

        }
        else {
            
            this.removeEvents()
        }
    }

    page1ClickUnKnowEvent = () => {
        WordManager.getWordManager().shouldAddCurWord = true
        this.removeEvents()
    };

    page1ClickKnowEvent = () => {
        this.removeEvents()
    }

    page1Key1DownEvent = (e: KeyboardEvent) => {
        if (e.key === '1') {
            this.page1ClickKnowEvent()
        }
    };

    page1Key2DownEvent = (e: KeyboardEvent) => {
        if (e.key === '2') {
            this.page1ClickUnKnowEvent()
        }
    };



}

class Page3Events implements PageEvents {

    isRegister: boolean = false
    isNoted: boolean = false
    removeEvents() {
        if (this.isRegister) {
            document.removeEventListener('keydown', this.Page3Key2DownEvent)
            document.removeEventListener('keydown', this.Page3ArrowRighrtDown)
            document.removeEventListener('keydown', this.Page3WDownEvent)
            this.isRegister = false
            this.isNoted = false
            console.log('页面3事件移除成功')

            WordManager.getWordManager().shouldRefreshCurWord = true
        }
    }

    registerEvents(): void {
        //这一行代码是刷新页面用的，后面要做优化
        // this.self.words.isChanged = true
        if (!this.isRegister) {
            document.addEventListener('keydown', this.Page3Key2DownEvent)
            document.addEventListener('keydown', this.Page3ArrowRighrtDown)
            document.addEventListener('keydown', this.Page3WDownEvent)
            this.isRegister = true
            console.log('页面3事件注册成功')
        }
    }

    public receiveChanges(page: number): void {
        if (page === 3 && !this.isRegister) {
            this.registerEvents()

        }
        else {
            
            this.removeEvents()
        }
    }



    Page3Key2DownEvent = (e: KeyboardEvent) => {
        if (e.key === '2') {
            WordManager.getWordManager().shouldAddCurWord = true
        }
    }

    Page3ArrowRighrtDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
            console.log('--> 触发')
            this.removeEvents()
            //在离开的时候决定是否加入当前单词
            WordManager.getWordManager().addCurWord()
        }
    }
    // Page3ArrowRighrtDown(self: Page3Events) {
    //     return 
    // }

    Page3WDownEvent = (e: KeyboardEvent) => {
        if (e.key === "w") {
            WordManager.getWordManager().addCurWordNote()
        }
    }

}

class PageMainWindowEvents implements PageEvents {
    isRegister: boolean = false

    registerEvents(): void {
        document.addEventListener('keyup', this.keyMDownEvents)
        document.addEventListener('keyup', this.keyNDownEvents)
        console.log("主页面事件注册成功")
    }
    removeEvents(): void {
        document.removeEventListener('keyup', this.keyMDownEvents)
        document.removeEventListener('keyup', this.keyNDownEvents)
        console.log("主页面事件移除成功")
    }

    receiveChanges(page: number): void {
        if (page === 3) {
            if (!this.isRegister) {
                this.registerEvents()
                this.isRegister = true
            }
        }
        else {
            if (this.isRegister) {
                this.removeEvents()
                this.isRegister = false
            }
        }
    }
    //move back
    keyNDownEvents = (e: KeyboardEvent) => {
        if (e.key === "n") {
            console.log('n 触发')
            MainWindow.getMainWindow().moveBack()
        }
    }

    keyMDownEvents =(e: KeyboardEvent) => {
        if (e.key === "m") {
            console.log('m 触发')
            MainWindow.getMainWindow().moveForWard()
        }
    }
}
//观察鼠标 键盘事件，并做出对应的反馈
class Observer {

    //members for page change detection
    curPage: number = -1
    isPageChanged: boolean = false
    fans: PageEvents[] = []

    //members for progress change detection
    finishedCount: number = 0
    unFinishedCount: number = 0
    forgetWordCount: number = 0
    words: WordManager = WordManager.getWordManager()

    window: MainWindow = MainWindow.getMainWindow()
    constructor() {
        let Page1Eventshandler = new Page1Events()
        let Page3EventsHandler = new Page3Events()
        let pageMainWindowHandler = new PageMainWindowEvents()

        this.followChange(pageMainWindowHandler)
        this.followChange(Page1Eventshandler)
        this.followChange(Page3EventsHandler)
    }

    public followChange(page: PageEvents) {
        this.fans.push(page)
        console.log('subject success!')
    }



    public startMonitor() {
        setInterval(() => {
            //监测页面变化
            this.queryCurPage()

            //监测进度条变化
            this.queryProgressChange()
        }, refereshTime)
    }

    //这个是查询所在页面的
    private queryCurPage() {
        let curPage_tmp = this.curPage
        //页面判别逻辑
        //在页面1 ,否则在页面3
        let btnUnfamiliar = document.querySelector(UnFamiliarDiv)
        if (btnUnfamiliar !== null)
            this.curPage = 1
        else
            this.curPage = 3
        let rvwpag = document.querySelector(reViewPage)
        if (rvwpag) this.curPage = 4

        //如果页面改变，那么就通知注册事件，避免多次重复的通知

        if (curPage_tmp !== this.curPage) this.isPageChanged = true
        if (this.isPageChanged) {
            this.fans.forEach(item => {
                item.receiveChanges(this.curPage)
            })

            //如果当前是在页面3 那么就将curWord刷新为当前单词
            if (this.curPage === 3) this.words.refreshCurWord(readPage3CollinsContentWorkFunction())
            this.window.queryWordsIsReady(this.curPage)
            this.isPageChanged = false
        }
    }



    //这个是刷新进度条 记录单词是否移除的
    private queryProgressChange() {
        let progressHtml = document.querySelector(progressBar) as HTMLElement;

        // 如果不在page1，返回
        if (progressHtml == null) return;

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
                if (style?.includes('background-color: rgb(32, 158, 133)')) {
                    finished = number;
                } else if (style?.includes('background-color: rgb(245, 245, 245)')) {
                    unfinished = number;
                } else if (style?.includes('background-color: rgb(248, 148, 6)')) {
                    forget = number;
                }
            }
        }
        if (forget - this.forgetWordCount < 0) 
        {
            console.log('remove Wrod triggered')
            this.words.shouldRemoveLastWord = true
        }

        this.finishedCount = finished
        this.unFinishedCount = unfinished
        this.forgetWordCount = forget
    }


}


class CardWidget {

    constructor(word: Word) {
        this.Html = `<div class="wordCard">
        ${this.getCardHeader(word)
            }
        ${this.getNote(word)
            }
        ${this.getMeaningHtml(word)
            }
        ${this.getCet6ExampleSentence(word)
            }
        ${this.getForgetTimeHtml(word)
            }
    </div>`
    }

    private getNote(word: Word) {
        if (word.note === '') return ''
        else return `<p id = "wordNote">
            ${word.note}
        </p>`
    }

    private getCardHeader(word: Word) {
        return `<p class = "wordName">
        ${word.wordName}
    </p>`
    }

    private getMeaningHtml(word: Word) {
        function generatreLi(tmp: WordInterpretation) {

            let type = tmp.wordType

            let Meaning = ''

            tmp.wordMeaning.forEach(item => {
                Meaning += item
                Meaning += " "
            })
            let body = `<li>
            <div>
            <p>${type}. ${Meaning}</p>
            <p>${tmp.exampleSentence}<p>
            </div>
            </li>`
            return body
        }
        let li_s = ''

        word.wordMeaning.forEach(item => {
            li_s += generatreLi(item)
        })

        return `
        <div>
        <ol>
         ${li_s
            }  
        </ol>
    </div>
        `

    }

    private getCet6ExampleSentence(word: Word) {
        if (word.Cet6.length == 0) return ''
        function gennerateLi(tmp: CET6Sentence) {
            return `<p>${tmp.sentenceEn}</p>
            <p>${tmp.sentenceCN}</p>
            `
        }
        let body = ''
        word.Cet6.forEach(item => {
            body += gennerateLi(item)
        })
        return `<div>
        ${body}
        </div>`
    }

    private getForgetTimeHtml(word: Word) {
        return `<span>遗忘次数: ${word.getForgetTime()}</span>`
    }

    getHtml(): string {
        return this.Html
    }

    Html: string
}

class MainWindow {
    widget: HTMLElement

    showed: boolean = false;
    created: boolean = false;
    self: MainWindow = this
    curIndex: number = 0
    reviewQueue: Word[] = []
    stateBox: string = `<p class="stateBox">当前需背单词
    <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
    目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`
    static singleton: MainWindow = new MainWindow()

    static getMainWindow() {
        return this.singleton
    }

    private constructor() {
        this.widget = document.createElement('div')
        this.widget.id = "mainBody";
    }

    private createWidget() {
        if (!this.created) {
            document.querySelector(studyPage)?.appendChild(this.widget);
            if (document.getElementById("mainBody") !== null) this.created = true
        }
    }

    public queryWordsIsReady(page: number)
    {
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
            this.curIndex = 0
            this.widget.style.visibility = "hidden"
        }
        

        

    }
    //根据当前页面决定是否需要展示
    public show() {
        this.self.createWidget()
        this.stateBox = `<p class="stateBox">当前需背单词
        <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
        目前索引<span style="color: #28bea0;">${this.curIndex+1}</span></p>`
        if (this.reviewQueue.length !== 0)
            this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex])
        else this.widget.innerHTML = this.stateBox
        this.widget.style.visibility = "visible"
    }

    private generatreCard(word: Word) {
        let card = new CardWidget(word)
        return card.getHtml()
    }

    public moveForWard() {
        if (this.reviewQueue.length === 0) return

        this.curIndex++
        if (this.curIndex === this.reviewQueue.length) this.curIndex = 0

        this.stateBox = `<p class="stateBox">当前需背单词
            <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
            目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`
        this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex])
    }

    public moveBack() {
        if (this.reviewQueue.length === 0) return
        this.stateBox = `<p class="stateBox">当前需背单词
            <span style="color: #f55b63;">${this.reviewQueue.length}</span>,
            目前索引<span style="color: #28bea0;">${this.curIndex}</span></p>`
        this.curIndex--
        if (this.curIndex < 0) this.curIndex = this.reviewQueue.length - 1


        this.widget.innerHTML = this.stateBox + this.generatreCard(this.reviewQueue[this.curIndex])

    }


    Html: string = "null"
}


class Server {
    observer: Observer = new Observer()

    constructor() {

    }
    start() {
        this.observer.startMonitor()
    }
}

function main(): void {
    let server = new Server()
    setTimeout(() => {
        alert('加载成功')
        server.start()
    }, 3000)
}
main()

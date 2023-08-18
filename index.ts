import { RAE } from "rae-api";
import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
import { load } from 'ts-dotenv';

const env = load({
    OPENAI: String,
});

const rae = new RAE();

interface WordDefinition {
    word: String;
    definition: String;
    synonyms: Array<String>;
    antonyms: Array<String>;
}

const getWordDefinition = async (word: string) => {
    const id = (await rae.searchWord(word)).results[0].id;
    let definition;
    (await rae.fetchWord(id)).definitions.map((v, i) => {
        if (i == 0) definition = v.content;
        //console.log(`${v.content}, Tipo: ${v.type}`)
    })
    const api = new ChatGPTUnofficialProxyAPI({
        accessToken: env.OPENAI,
        apiReverseProxyUrl: "https://ai.fakeopen.com/api/conversation"
    })
    let sya = (await api.sendMessage(`pretend you are an api, given the word ${word} and its definition "${definition}" give me 5 synonyms and 5 antonyms, in spanish, only send the synonyms and antonyms seperated by commas and no other text or styling, an example response would be "fine,good,well,happy,smiling,bad,horrible,disgusted,sick,horrid"`)).text.toLocaleLowerCase().replace(/\s/g, "").replace("synonyms:", "").replace("antonyms:", "")
    const synonyms = sya.split(",").splice(0, 5)
    const antonyms = sya.split(",").splice(5, sya.length)
    return {word, definition, synonyms, antonyms};
}


(async () => {
    const word = "medieval"
    console.log(`La palabra es: ${word}`);
    
    const wordData = await getWordDefinition(word);
    console.log(wordData)
})()
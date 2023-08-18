import { RAE } from "rae-api";
import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
import { load } from 'ts-dotenv';
import chalk from 'chalk';
import inquirer from "inquirer";
import { isNonNullChain } from "typescript";
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
        //TODO: get a selection to determine which definition the user is looking for
        if (i == 0) definition = v.content;
    })
    const api = new ChatGPTUnofficialProxyAPI({
        accessToken: env.OPENAI,
        apiReverseProxyUrl: "https://ai.fakeopen.com/api/conversation"
    })
    let sya = (await api.sendMessage(`pretend you are an api, given the word ${word} and its definition "${definition}" give me 5 synonyms and 5 antonyms, in spanish, only send the synonyms and antonyms seperated by commas and no other text or styling, an example response would be "fine,good,well,happy,smiling,bad,horrible,disgusted,sick,horrid"`)).text;
    sya = sya.toLocaleLowerCase().replace(/\s/g, "").replace("synonyms:", "").replace("antonyms:", "").replace(/\./g, ",")
    const synonyms = sya.split(",").splice(0, 5)
    const antonyms = sya.split(",").splice(5, 10)
    return {word, definition, synonyms, antonyms};
}


(async () => {
    //TODO: Input from a file and output to a file or simple cli based on what the user wants
    console.log(chalk.bold.cyan("Welcome to a hack-y ") + chalk.bold.redBright("RAE") + chalk.bold.cyan(" scraper!"))
    const filePrompt = await inquirer.prompt({
        type: 'rawlist',
        name: 'inputType',
        message: 'Do you want to read from a file or enter words manually?',
        default: 'Manually',
        choices: [{
            name: 'Manually',
        },
        {
            name: 'File (Expert Mode)'
        }]
      })
    if (filePrompt.inputType === 'Manually') {
        let done = false;
        while (!done) {
            const todoPrompt = await inquirer.prompt({
                type: 'rawlist',
                name: 'isDone',
                message: 'Do you want to search for a word or exit?',
                default: 'Search for a word',
                choices: [{
                    name: 'Search for a word',
                },
                {
                    name: 'Exit'
                }]
              })
              if (todoPrompt.isDone === 'Search for a word') {
                const wordPrompt = await inquirer.prompt({
                    type: 'input',
                    name: 'word',
                    message: 'What is the word?',
                    validate: (input: String) => {
                        return input.length != 0
                    }
                  })
                  console.log(wordPrompt.word)
              } else {
                done = true;
              }
        }
    }
    return console.log(chalk.cyan("Bye!"))
    const word = "medieval"
    console.log(`La palabra es : ${word}`);
    
    const wordData = await getWordDefinition(word);
    console.log(wordData)
})()
import { RAE } from "rae-api";
import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
import { load } from 'ts-dotenv';
import chalk from 'chalk';
import inquirer from "inquirer";
import * as fs from 'node:fs/promises';
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

const getWordDefinition = async (word: string): Promise<WordDefinition | undefined> => {
    const listOfWords = (await rae.searchWord(word))
    if (listOfWords.results.length == 0) {
        console.log(chalk.red("No words found!"))
        return undefined
    }
    const id = listOfWords.results.length == 1 ? listOfWords.results[0].id : (await inquirer.prompt({
        type: 'rawlist',
        name: 'id',
        message: 'Select 1: ',
        choices: listOfWords.results.map((v) => {
            return {name: v.header, value: v.id}
        })
      })).id
    const listOfDefinitions = (await rae.fetchWord(id)).definitions;
    const definition = listOfDefinitions.length == 1 ? listOfDefinitions[0].content : (await inquirer.prompt({
        type: 'rawlist',
        name: 'definition',
        message: 'Multiple definitions found, choose the one that best fits: ',
        choices: listOfDefinitions.map((v) => {
            return {name: v.content}
        })
      })).definition
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
    const todo = (await inquirer.prompt({
        type: 'rawlist',
        name: 'inputType',
        message: 'Do you want to read from a file or enter words manually?',
        default: 'Manually',
        choices: [{
            name: 'Manually',
        },
        {
            name: 'File (Expert Mode)'
        }, 
        {
            name: 'Exit'
        }]
      })).inputType
    if (todo === 'Manually') {
        let done = false;
        while (!done) {
            const todo = (await inquirer.prompt({
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
              })).isDone
              if (todo === 'Search for a word') {
                const word = (await inquirer.prompt({
                    type: 'input',
                    name: 'word',
                    message: 'What is the word?',
                    validate: (input: String) => {
                        return input.length != 0
                    }
                  })).word
                  const wordDefinition = await getWordDefinition(word);
                  if (!wordDefinition) continue;
                  console.log(chalk.cyan("Word: ") + chalk.white(wordDefinition.word))
                  console.log(chalk.blue("Definition: ") + chalk.white(wordDefinition.definition))
                  console.log(chalk.green("Synonyms: ") + chalk.white(wordDefinition.synonyms.join(", ")))
                  console.log(chalk.red("Antonyms: ") + chalk.white(wordDefinition.antonyms.join(", ")))
              } else {
                done = true;
              }
        }
    } else if (todo === 'File (Expert Mode)') {
        const filePath = (await inquirer.prompt({
            type: 'input',
            name: 'file',
            message: 'Where is the file (Relative or Absolute): ',
            validate: (input: String) => {
                return input.length != 0
            }
          })).file
          let file = null;
          try {
            file = await fs.readFile(filePath, { encoding: 'utf-8'})
          } catch {
            console.log(chalk.red('Error reading from file!'))
          }
          if (!file) return;
          file = file.split(/\n/g)
          let wordArr = []
          console.log(file)
          for (let word of file) {
            console.log(word)
            const wordDefinition = await getWordDefinition(word);
            if (!wordDefinition) {
                console.log(chalk.red('Error getting word definition for: ') + chalk.white(word))
                continue
            };
            wordArr.push(wordDefinition)
          }
          const fname: String = (await inquirer.prompt({
              type: 'input',
              name: 'fileName',
              message: 'Choose a name for the file to save the definitions: ',
              validate: (input: String) => {
                  return input.length != 0
              }
            })).fileName

            await fs.writeFile('./' + fname + '.txt', wordArr.map((v) => {
              return `Word: ${v.word}\nDefinition: ${v.definition}\nSynonyms: ${v.synonyms.join(', ')}\nAntonyms: ${v.antonyms.join(', ')}`
            }).join('\n\n'));
            console.log(chalk.green('Saved definitions to file: ') + chalk.white(fname) + '.txt')

    }
    return console.log(chalk.cyan("Bye!"))
})()
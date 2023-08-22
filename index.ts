import { RAE } from "rae-api";
import { ChatGPTUnofficialProxyAPI } from "chatgpt";
import { load } from "ts-dotenv";
import chalk from "chalk";
import inquirer from "inquirer";
import * as fs from "node:fs/promises";
import google from "googlethis";
import Choice from "inquirer/lib/objects/choice";
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

const getWordDefinition = async (
  word: string,
): Promise<WordDefinition | undefined> => {
  let listOfWords = await rae.searchWord(word);
  let listOfDefinitions: Array<String> = [];
  if (listOfWords.results.length == 0) {
    console.log(chalk.redBright("Word(s) not found in RAE!"));
    const toSearch = (
      await inquirer.prompt({
        type: "rawlist",
        name: "toSearch",
        message: "Would you rather: ",
        choices: [
          {
            name: "Search on Google for definition.",
            value: true,
          },
          {
            name: "Continue with the other words.",
            value: false,
          },
        ],
      })
    ).toSearch;
    if (!toSearch) return undefined;
    else {
      const options = {
        page: 0,
        safe: false, // Safe Search
        parse_ads: false, // If set to true sponsored results will be parsed
      };

      const response = await google.search(`define ${word}`, options);
      if (response.knowledge_panel.description)
        listOfDefinitions.push(response.knowledge_panel.description);
      if (response.featured_snippet.description)
        listOfDefinitions.push(response.featured_snippet.description);
      if (listOfDefinitions.length == 0) {
        console.log(
          chalk.redBright("Error searching Google for: ") +
            chalk.whiteBright(word),
        );
        return undefined;
      }
    }
  } else {
    const id =
      listOfWords.results.length == 1
        ? listOfWords.results[0].id
        : (
            await inquirer.prompt({
              type: "rawlist",
              name: "id",
              message: "Select 1: ",
              choices: listOfWords.results.map((v) => {
                return { name: v.header, value: v.id };
              }),
            })
          ).id;
    listOfDefinitions = (await rae.fetchWord(id)).definitions.map(
      (v) => v.content,
    );
  }
  const definition =
    listOfDefinitions.length == 1
      ? listOfDefinitions[0]
      : (
          await inquirer.prompt({
            type: "rawlist",
            name: "definition",
            message:
              "Multiple definitions found, choose the one that best fits: ",
            choices: listOfDefinitions.map((v) => new Choice(v, v)),
          })
        ).definition;
  const api = new ChatGPTUnofficialProxyAPI({
    accessToken: env.OPENAI,
    apiReverseProxyUrl: "https://ai.fakeopen.com/api/conversation",
  });
  let sya;
  try {
    sya = (
      await api.sendMessage(
        `pretend you are an api, given the word ${word} and its definition "${definition}" give me 5 synonyms and 5 antonyms, in spanish, only send the synonyms first and then the antonyms seperated by commas in a single line with no other text or styling or semicolons, an example response would be "fine,good,well,happy,smiling,bad,horrible,disgusted,sick,horrid"`,
      )
    ).text;
  } catch (err) {
    console.log(
      chalk.redBright("Error getting synonyms and antonyms for: ") +
        chalk.white(word),
    );
    return;
  }
  sya = sya
    .toLocaleLowerCase()
    .replace("synonyms:", "")
    .replace("antonyms:", "")
    .replace(/\./g, ",")
    .replace("sinónimos:", "")
    .replace("antónimos:", "")
    .replace(/\, /g, ",")
    .replace(/\n/g, "");
  const synonyms = sya.split(",").splice(0, 5);
  const antonyms = sya.split(",").splice(5, 10);
  return { word, definition, synonyms, antonyms };
};

(async () => {
  console.log(
    chalk.bold.cyanBright("Welcome to a hack-y ") +
      chalk.bold.redBright("RAE") +
      chalk.bold.cyanBright(" scraper!"),
  );
  console.log(
    chalk.bold.cyanBright("Made By ") +
      chalk.bold.greenBright("NotARoomba (Nathan)") +
      chalk.bold.cyanBright(" and ") +
      chalk.bold.greenBright("Awangran (Ashlee)"),
  );
  const todo = (
    await inquirer.prompt({
      type: "rawlist",
      name: "inputType",
      message: "Do you want to read from a file or enter words manually?",
      default: "Manually",
      choices: [
        {
          name: "Manually",
        },
        {
          name: "File (Expert Mode)",
        },
        {
          name: "Exit",
        },
      ],
    })
  ).inputType;
  if (todo === "Manually") {
    let done = false;
    while (!done) {
      const todo = (
        await inquirer.prompt({
          type: "rawlist",
          name: "isDone",
          message: "Do you want to search for a word or exit?",
          default: "Search for a word",
          choices: [
            {
              name: "Search for a word",
            },
            {
              name: "Exit",
            },
          ],
        })
      ).isDone;
      if (todo === "Search for a word") {
        const word = (
          await inquirer.prompt({
            type: "input",
            name: "word",
            message: "What is the word?",
            validate: (input: String) => {
              return input.length != 0;
            },
          })
        ).word;
        const wordDefinition = await getWordDefinition(word);
        if (!wordDefinition) continue;
        console.log(
          chalk.cyanBright("Word: ") + chalk.white(wordDefinition.word),
        );
        console.log(
          chalk.blue("Definition: ") + chalk.white(wordDefinition.definition),
        );
        console.log(
          chalk.green("Synonyms: ") +
            chalk.white(wordDefinition.synonyms.join(", ")),
        );
        console.log(
          chalk.redBright("Antonyms: ") +
            chalk.white(wordDefinition.antonyms.join(", ")),
        );
      } else {
        done = true;
      }
    }
  } else if (todo === "File (Expert Mode)") {
    const filePath = (
      await inquirer.prompt({
        type: "input",
        name: "file",
        message: "Where is the file (Relative or Absolute): ",
        validate: (input: String) => {
          return input.length != 0;
        },
      })
    ).file;
    const fname: String = (
      await inquirer.prompt({
        type: "input",
        name: "fileName",
        message: "Choose a name for the file to save the definitions: ",
        validate: (input: String) => {
          return input.length != 0;
        },
      })
    ).fileName;
    let file = null;
    try {
      file = await fs.readFile(filePath, { encoding: "utf-8" });
    } catch {
      console.log(chalk.redBright("Error reading from file!"));
    }
    let resumeable = null;
    try {
      resumeable = (
        await fs.readFile("./" + fname + ".txt", { encoding: "utf-8" })
      ).split(/Word: /g);
    } catch {
      resumeable = null;
    }

    if (!file) return;
    file = file.split(/\n/g);
    let lastWord = null;
    if (resumeable) {
      lastWord = resumeable[resumeable.length - 1].split(/\n/)[0];
      let index = file.indexOf(lastWord);
      file.splice(0, index == -1 ? 0 : index + 1);
      console.log(
        chalk.bold.green("File already exists! Resuming from word: ") +
          chalk.red(lastWord),
      );
    }
    for (let word of file) {
      console.log(
        chalk.green("Getting definition for word: ") + chalk.white(word),
      );
      const wordDefinition = await getWordDefinition(word);
      if (!wordDefinition) {
        console.log(
          chalk.redBright("Error getting word definition for: ") +
            chalk.white(word),
        );
        continue;
      }
      await fs.appendFile(
        "./" + fname + ".txt",
        `Word: ${wordDefinition.word}\nDefinition: ${
          wordDefinition.definition
        }\nSynonyms: ${wordDefinition.synonyms.join(
          ", ",
        )}\nAntonyms: ${wordDefinition.antonyms.join(", ")}\n\n`,
      );
    }
    console.log(
      chalk.green("Saved definitions to file: ") + chalk.white(fname) + ".txt",
    );
  }
  return console.log(chalk.cyanBright("Bye!"));
})();

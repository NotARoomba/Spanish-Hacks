import { RAE } from "rae-api";

(async () => {
    const word = "hola"
    console.log(`La palabra es: ${word}`);
    const rae = new RAE();
    const id = (await rae.searchWord(word)).results[0].id;
    console.log("Los definiciones son:");
    (await rae.fetchWord(id)).definitions.map(v => {
        console.log(`${v.content}, Tipo: ${v.type}`)
    })
})()
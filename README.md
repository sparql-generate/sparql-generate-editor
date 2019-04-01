[![NPM](https://img.shields.io/npm/v/sparql-generate-editor.svg)](https://www.npmjs.org/package/sparql-generate-editor)

# SPARQL-Generate Editor

SPARQL-Generate Editor (*SGE*) is a fork of *YASQE* (Yet Another SPARQL Query Editor) that is part of the the [*YASGUI*](https://github.com/OpenTriply/YASGUI) suite of SPARQL tools.  For more information about *SGE*, its features, 
and a HOWTO for including it in your own web site, visit https://sparql-generate.github.io/sparql-generate-editor

# build

```
docker build -t sparql-generate-editor .
docker run -it --rm --name sg-editor -p 4000:4000 -v c:/Users/peth-to-project:/home/node/app sparql-generate-editor /bin/sh
```

then in the terminal:

```
npm install
npm run dev
# or npm run build
```

docker build -t sparql-generate-editor .
docker run -it --rm --name sg-editor -p 4000:4000 -v c:/Users/maxime.lefrancois/netbeansprojects/sparql-generate/sparql-generate-editor:/home/node/app sparql-generate-editor /bin/sh



npm run dev
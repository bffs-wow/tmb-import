@REM run the app - log into TMB and download JSON dump
node src/app.js
@REM clone the site github pages repo (or pull if it exists)
git -C repo pull || git clone https://github.com/bffs-wow/loot.git repo 
cd repo
git checkout gh-pages

@REM copy the downloaded json into the repo
copy ..\temp\tmb-data.json assets\tmb-data.json

@REM commit & push
git add .
git commit -m "Automated tmb-data import"
git push origin

@REM Uncomment the below to debug issues, it will leave the cmd window open
@REM pause
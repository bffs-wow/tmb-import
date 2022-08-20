@REM run the app - log into TMB and download JSON dump
node src/app.js
@REM clone the site github pages repo (or pull if it exists)
git -C repo pull || git clone https://github.com/bffs-wow/loot.git repo 
@REM copy the downloaded json into the repo
copy temp\tmb-data.json repo\assets\tmb-data.json
cd repo
@REM commit & push
git add .
git commit -m "From script"
git push origin gh-pages
@REM Uncomment the below to debug issues, it will leave the cmd window open
@REM pause
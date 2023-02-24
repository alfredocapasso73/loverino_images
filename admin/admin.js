


const clear_db = async () => {
    try{
        //await connectToDb();
        //await clear_collections();
        console.log(`All collections truncated`);
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const usage = 'usage: node admin.js [geo_install,geo_install_test,clear_db, bots, test, populate_bts, generateBots]';
if(process.argv.length < 3){
    console.log('usage:',usage);
}
else{
    switch(process.argv[2]){
        case 'clear_db': clear_db().catch(console.log); break;
        default: console.log(usage);
    }
}
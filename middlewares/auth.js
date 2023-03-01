const superagent = require('superagent');
const api_base_url = process.env.API_BASE_URL;

exports.validateRequest = async (req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        const auth = req.headers.authorization.split(' ')[1];
        try{
            const url = `${api_base_url}/user/apiToken`;
            process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
            const api_call = await superagent.post(url).set('Accept', 'application/json').set('Authorization', `Bearer ${auth}`);
            const body = api_call?.body;
            if(body?.message !== 'ok' || !body?.user){
                return res.status(401).send({message: 'unauthorized'});
            }
            req.user = body.user;
            req.auth = auth;
            next();
        }
        catch(exception){
            console.log("exception",exception);
            res.status(401).send({message: 'unauthorized'});
        }
    }
    else{
        res.status(401).send({message: 'unauthorized'});
    }
}

exports.validateAdminRequest = async (req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        const auth = req.headers.authorization.split(' ')[1];
        try{
            const url = `${api_base_url}/texas/apiToken`;
            const api_call = await superagent.post(url).set('Accept', 'application/json').set('Authorization', `Bearer ${auth}`);
            const body = api_call?.body;
            if(body?.message !== 'ok'){
                return res.status(401).send({message: 'unauthorized'});
            }
            req.auth = auth;
            next();
        }
        catch(exception){
            console.log("exception",exception);
            res.status(401).send({message: 'unauthorized'});
        }
    }
    else{
        res.status(401).send({message: 'unauthorized'});
    }
}
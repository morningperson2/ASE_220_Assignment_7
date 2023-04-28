const http=require('http');
//const server=http.createServer().listen(8080);
const process=require('./lib/process.js');
const express = require('express');
const app = express();
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const albumArt = require( 'album-art' );

const uri = "mongodb+srv://Assignment6:password1234@ase220.8znrdij.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//server.on('request',async(req,res)=>{
//	process(req,res);
//});

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.listen(8080, () => {
	console.log('Server started on port 8080');
});

app.use('/api', (req, res, next) => {
	//Obtain request method
	console.log(req.method);

	//Obtain the current timestamp (why do we need this?)
	const currentDate=new Date();
	const timestamp=currentDate.getTime();
	console.log(timestamp);
  
	//Write something in the header of the response 
	res.setHeader('Access-Control-Allow-Origin', '*');
	//res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	//res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, POST, DELETE');
	//res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
	//res.writeHead(200,{'Content-Type':'application/json'});
	//express.json();
	next();
});

app.get('/api/data', async(req, res) => {
	try {
		const collection = client.db("Assignment_6").collection("Albums");
		const result = await collection.findOne({});
		if (result && result.Data) {
			res.write(JSON.stringify(result.Data));
		} else {
			res.write("File not found");
		}
		res.end();
	} catch (error) {
		console.error(error);
		res.end("Error occurred while retrieving file");
	}
})

app.post('/api/data', async (req, res) => {
    try {
        const collection = client.db('Assignment_6').collection('Albums');

        const post = req.body;

        const update = { $push: { Data: { $each: [post] } } };

        const result = await collection.updateOne({}, update);

        if (result.modifiedCount === 0) {
            res.status(404).send('Requested data submission does not have a file to go to');
        } else {
            res.status(200).send('Data submission performed successfully');
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Unexpected error');
    }
});

app.put('/api/data', async (req, res) => {
	const collection = client.db('Assignment_6').collection('Albums');

    // Obtain file name
    let myfile = req.params.myfile;

    try {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        }).on('end', async () => {
            console.log(body);

            try {
                let data = JSON.parse(body);

                //loop through all albums and update the image if a link does not exist
                for (let i = 0; i < data.length; i++) {
                    if (!data[i].image) {
                        const art = await albumArt(data[i].band, { album: data[i].album, size: 'large' });
                        if (art) {
                            data[i].image = art;
                        }
                    }
                }

                const result = await collection.updateOne(
                    {},
                    { $set: { Data: data } },
                    { upsert: true }
                );

                console.log(result);

                res.json('\n' + myfile);
                res.end();
            } catch (error) {
                console.error(error);
                res.status(400).json('Invalid JSON input');
            }
        });
    } catch (error) {
        console.error(error);
        res.status(404).json('File not found');
    }
});

// DELETE request using MongoDB
app.delete('/api/:index', async (req, res) => {
    //Parse requested object index to be deleted from URL endpoint
    const index = req.params.index;

    try {
        //attempt a connection
        await client.connect();

        //refer to our collection
        const collection = client.db('Assignment_6').collection('Albums');

        //delete requested document
        const result = await collection.updateOne({}, { $unset: { [`Data.${index}`]: 1 } });

        //if statement to test the results and return a success/error code
        if (result.modifiedCount === 1) {
            res.status(200).send(`Object ${index} successfully deleted`);
            console.log(`Delete of index ${index} performed successfully`);
        } else {
            res.status(404).send(`Index ${index} not found`);
            console.log(`Requested delete of index ${index} not found`);
        }
    } catch (err) {
        //console error if error
        console.log(err);
        res.status(500).send('Unexpected error');
    } finally {
        // Close the connection
        //await client.close();
        res.end();
    }
});

app.get('/example_album', (req, res) => {
    const data={
        album: 'Example Album',
        band: 'Example Band',
        year: '2020',
        genre: 'Example Genre',
        label: 'Example Label',
        description: 'Example Description',
        reviews: 'Example Review',
    };
    res.render('example_album', data);
});
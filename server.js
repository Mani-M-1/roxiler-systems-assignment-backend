const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const path = require('path');
const axios = require("axios"); /*Importing the axios library*/



const port = 8080;

const app = express();

app.use(express.json());
app.use(cors());


// intialization of db 
let db = null;
const dbPath = path.join(__dirname, 'tasks.db');

const intializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })

        

        app.listen(port, () => {
            console.log(`Server listening on ${port}`);
        })
    }
    catch(err) {
        console.log(`DB error: ${err.message}`);
        process.exit(1);
    }
}


intializeDBAndServer();





const fetchAndInsert = async () => {
  const response = await axios.get(
    "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
  );
  const data = response.data;

  for (let item of data) {
    const queryData = `SELECT id FROM transactions WHERE id = ${item.id}`;
    const existingData = await db.get(queryData);
    if (existingData === undefined) {
      const query = `
   INSERT INTO transactions (id, title, price, description, category, image, sold, dateOfSale) 
   VALUES (
       ${item.id},
       '${item.title.replace(/'/g, "''")}',
       ${item.price},
       '${item.description.replace(/'/g, "''")}',
       '${item.category.replace(/'/g, "''")}',
       '${item.image.replace(/'/g, "''")}',
       ${item.sold},
       '${item.dateOfSale.replace(/'/g, "''")}'
   );
`; /*The .replace(/'/g, "''") in the SQL query helps prevent SQL injection attacks by escaping single quotes.*/

      await db.run(query);
    }
  }
  console.log("Transactions added");
};

// fetchAndInsert(); //run only once to store data in database


// defaulf msg to show when deployed
app.get('/', async (req, res) => {
    res.status(200).json({message: "Backend running successfully!"});
})


// get all tasks
app.get('/tasks', async (req, res) => {
    console.log(req.query);
    if (req.query.search_q !== "" && req.query.month !== "") {

        try {
            const query = `
                SELECT * FROM transactions 
                WHERE substr(dateOfSale, 6, 2) = '${req.query.month}' 
                AND 
                (title LIKE '%${req.query.search_q}%' 
                OR description LIKE '%${req.query.search_q}%' 
                OR price LIKE '%${req.query.search_q}%');
                LIMIT 10 
                OFFSET ${req.query.offset}`;
            
            console.log(query)
            const tasks = await db.all(query);
    
            res.status(200).json({message: "Tasks fetched successfully!", tasks});
        }
        catch(err) {
            res.status(500).json({message: err.message});
        }
    }
    else if (req.query.search_q === "" && req.query.month !== "") {
        try {
            const query = `
                SELECT * 
                FROM transactions 
                WHERE substr(dateOfSale, 6, 2) = '${req.query.month}';
                LIMIT 10 
                OFFSET ${req.query.offset}'
            `;

            console.log(query);
            const tasks = await db.all(query);
    
    
            res.status(200).json({message: "Tasks fetched successfully!", tasks});
        }
        catch(err) {
            res.status(500).json({message: err.message});
        }
        
    }
    else if (req.query.search_q !== "" && req.query.month === "") {
        try {
            const query = `
                SELECT * 
                FROM transactions
                WHERE title LIKE '%${req.query.search_q}%' 
                OR description LIKE '%${req.query.search_q}%' 
                OR price LIKE '%${req.query.search_q}%'; 
                LIMIT 10 
                OFFSET ${req.query.offset}'
            `;

            console.log(query);
            const tasks = await db.all(query);
    
    
            res.status(200).json({message: "Tasks fetched successfully!", tasks});
        }
        catch(err) {
            res.status(500).json({message: err.message});
        }
        
    }
    else {
        try {
            const query = `
                SELECT * 
                FROM transactions 
                LIMIT 10 
                OFFSET ${req.query.offset}
            `;
            const tasks = await db.all(query);
    
    
            res.status(200).json({message: "Tasks fetched successfully!", tasks});
        }
        catch(err) {
            res.status(500).json({message: err.message});
        }
        
    }

})


// get specific task by id 
app.get('/tasks/:taskId', async (req, res) => {
    try {
        const query = `
            SELECT * 
            FROM transactions 
            WHERE id = ${req.params.taskId}
        `;
        const task = await db.get(query);

        if (!task) {
            res.status(404).json({message: "Task not found"});
        }


        res.status(200).json({message: "Task fetched successfully!", task});
    }
    catch(err) {
        res.status(500).json({message: err.message});
    }
})


// update specific task
app.put('/tasks/:taskId', async (req, res) => {
    try {
        const {title, description, image, price, category, sold, dateOfSale} = req.body;
        const query = `
            UPDATE transactions 
            SET title='${title}', description='${description}', image='${image}', price=${price}, category='${category}', sold=${sold}
            WHERE id = '${req.params.taskId}'
        `;

        await db.run(query);


        res.status(200).json({message: "Task updated successfully!"});
    }
    catch(err) {
        res.status(500).json({message: err.message});
    }
})


// create a new task
app.post('/tasks', async (req, res) => {
    console.log(req.body);
    try {
        const query = `
            INSERT INTO transactions (title, price, description, category, image, sold, dateOfSale) 
            VALUES (
                '${req.body.title.replace(/'/g, "''")}',
                ${req.body.price},
                '${req.body.description.replace(/'/g, "''")}',
                '${req.body.category.replace(/'/g, "''")}',
                '${req.body.image.replace(/'/g, "''")}',
                ${req.body.sold},
                '${req.body.dateOfSale.replace(/'/g, "''")}'
            );
        `; 

        console.log(query);

        await db.run(query);

        res.status(200).json({message: "Task created successfully!"});
    }
    catch(err) {
        res.status(500).json({message: err.message});
    }
})
// servidor 
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// para evitar TypeError: Cannot read property '_id' of undefined
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

// incluyo funciones declaradas en mongodb.js
const { connectToMongodb, disconnectToMongodb} = require('./src/mongodb')
//Middleware
app.use((req, res, next) => {
    res.header("Content-Type", "application/json; charset=utf-8");
    next();
});
app.get('/', (req, res) => { res.status(200).end('¡Bienvenido a la API de prendas!'); } );

//Endpoints
app.get('/prendas', async (req, res) => {
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('prendas')
    const prendas = await db.collection('prendas').find().toArray()
    await disconnectToMongodb()
    res.json(prendas)
});
// Metodos de lectura
app.get('/prendas/:codigo', async (req, res) => {
    const prendaID = parseInt(req.params.codigo) || 0
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('prendas')
    const prenda = await db.collection('prendas').findOne({ codigo: prendaID})
    await disconnectToMongodb()
    !prenda ? res.status(404).send('No se encontró la prenda con el codigo '+ prendaID): res.json(prenda)
});

app.get('/prendas/nombre/:nombre', async (req, res) => {
    const nombrePrenda = req.params.nombre
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
     const regex = new RegExp(nombrePrenda.toLowerCase(), 'i') ;
    
    const db = client.db('prendas')
    const prendas = await db.collection('prendas').find({ nombre: regex}).toArray()
    await disconnectToMongodb()
    prendas.length == 0 ? res.status(404).send('No se encontró la prenda con el nombre '+ nombrePrenda): res.json(prendas)
})

app.get('/prendas/precio/:precio', async (req, res) => {
    const precioPrenda = parseInt(req.params.precio) || 0
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('prendas') 
    // gte: mayor o igual a
    const prendas = await db.collection('prendas').find({ precio: { $gte: precioPrenda } }).toArray()
    await disconnectToMongodb()
    prendas.length == 0 ? res.status(404).send('No se encontró la prenda con el precio '+ precioPrenda): res.json(prendas)

})

// Metodo de creacion
app.post('/prendas', async (req, res) => { 
    const nuevaPrenda = req.body
    if (nuevaPrenda === undefined) {
        res.status(400).send('Error en el formato de los datos de la prenda')
    }
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('prendas') 
    const collection = await db.collection('prendas').insertOne(nuevaPrenda)
        .then(() => {
            console.log('Nueva prenda creada')
            res.status(201).send(nuevaPrenda)
        }).catch(err => { 
            console.error(err)
        }).finally(() => { client.close()})
})

// Metodo de actualizacion
app.put('/prendas/:codigo', async (req, res) => { 
    const id = parseInt(req.params.codigo) || 0;
    const nuevosDatos = req.body
    if (!nuevosDatos) {
        res.status(400).send('Error en el formato de los datos recibidos')
    }
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('prendas') 
    
    const collection = await db.collection('prendas').updateOne({ codigo: id }, { $set: nuevosDatos })
        .then(() => {
            let mensaje ='Prenda actualizada con el código : ' + id
          res.status(200).json({ descripcion: mensaje , objeto: nuevosDatos})
        }).catch(err => { 
            let mensaje = 'Error al actualizar prende con el codigo: ' + id 
            console.error(err)
            res.status(500).json({descripcion : mensaje, objeto: nuevosDatos})
        }).finally(() => {
            client.close()
        })
})

// Metodo de eliminacion
app.delete('/prendas/:codigo', async (req, res) => { 
    const id = req.params.codigo;
    if (!id) {
        res.status(400).send('Error en el formato del codigo recibido')
    }
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    client.connect()
        .then(() => { 
            const collection = client.db('prendas').collection('prendas')
            return collection.deleteOne({codigo: parseInt(id)})
        }).then((resultado) => {
            if (resultado.deletedCount === 0) {
                res.status(404).send('No se pudo encontrar la prenda con id: '+id)
            } else {
                console.log('Prenda Eliminada')
                res.status(204).send('Prenda Eliminada')
            }
        }).catch((err) => {
            console.error(err)
             res.status(500).send('Error al eliminar prenda')
        }).finally(() => {
            client.close()
        })
})



app.get("*", (req, res) => {
  res.status(500).json({
    message: "No se encuentra la ruta solicitada",
  });
});

//Inicia el servidor
app.listen(PORT, () => console.log(`API de prendas escuchando en http://localhost:${PORT}`) );
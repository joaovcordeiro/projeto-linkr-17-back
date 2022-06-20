import connection from "../config/db.js";
import urlMetadata from 'url-metadata';
import joi from 'joi';

export async function editPost(req, res) {
    const { publicationId, description } = req.body;
    const { userId } = res.locals;

    try {
        const { rowCount } = await connection.query(`UPDATE publications 
                                SET text= $1
                                WHERE id = $2 AND "userId" = $3`,
            [description, publicationId, userId]);

        if (rowCount === 0) {
            return res.status(401).send("Dados inválidos!");
        }

        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
}

export async function postsGET(req, res) {
    try {

        const result = await connection.query('SELECT u.avatar, u.name, p.text, p.link FROM publications p JOIN users u ON p."userId" = u.id ORDER BY p."createdAt" DESC LIMIT 20');
        const posts = result.rows

        if (posts.length === 0) {
            res.send("Empty");
            return;
        }

        const answer = [];
        for (let i = 0; i < posts.length; i++) { answer.push({}) };

        posts.forEach((post, index) => {
            urlMetadata(post.link).then(metadata => {
                answer[index].avatar = post.avatar;
                answer[index].name = post.name;
                answer[index].text = post.text;
                answer[index].title = metadata.title;
                answer[index].description = metadata.description;
                answer[index].url = post.link;
                answer[index].image = metadata.image;
                if (!answer.filter(e => !e.name).length) res.send(answer);
            })
        })


    } catch (error) {
        console.log(`postsGET - ${error}`);
        res.sendStatus(500);
    }
}

export async function publishPOST(req, res) {
    try {

        const post = req.body;

        /* VALIDATION (JOI) */

        const postSchema = joi.object({
            url: joi.string().uri().required(),
            text: joi.string(),
            publicationCode: joi.string().required()
        });

        const validation = postSchema.validate(post);

        if (validation.error) {
            console.log(`publishPOST/VALIDATION (JOI) - ${validation.error}`);
            res.sendStatus(422);
            return;
        }

        /* SAVE TO DATABASE */

        await connection.query('INSERT INTO publications ("userId", text, link, "publicationCode") VALUES ($1, $2, $3, $4)', [res.locals.userId, post.text, post.url, post.publicationCode]);
        res.sendStatus(201);


    } catch (error) {
        console.log(`publishPOST - ${error}`);
        res.sendStatus(500);
    }
}

export async function deletePost(req, res) {
    const { postId } = req.params;
    const { userId } = res.locals;

    try {
        await connection.query('DELETE FROM likes WHERE "publicationId" = $1', [postId]);
        const { rowCount } = await connection.query('DELETE FROM publications WHERE "id" = $1 AND "userId" = $2', [postId, userId]);

        if (rowCount === 0) {
            return res.status(401).send("Dados inválidos!");
        }

        res.sendStatus(200);
    } catch (e) {
        console.log(e)
        res.sendStatus(500)
    }
}
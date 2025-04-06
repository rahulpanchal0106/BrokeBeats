import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export interface User {
  _id?: ObjectId;
  spotifyId: string;
  displayName: string;
  email: string;
  likedSongs: any[]; // Adjust this type based on your liked songs structure
  personalLibrary: any[]; // Adjust this type based on your track structure
}

export const createUser = async (userData: User) => {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');
    const result = await collection.insertOne(userData);
    return result.insertedId;
  } finally {
    await client.close();
  }
};

export const findUserBySpotifyId = async (spotifyId: string) => {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');
    return await collection.findOne({ spotifyId });
  } finally {
    await client.close();
  }
}; 
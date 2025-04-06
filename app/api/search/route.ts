import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('tracks');
    
    // Debug: Log a sample document to verify collection data
    const sampleDoc = await collection.findOne({});
    console.log('[DB] Sample document:', sampleDoc);
    
    // Check indexes more reliably
    const indexes = await collection.indexes();
    console.log('[DB] Current indexes:', indexes);
    
    // Better index existence check
    const textIndexExists = indexes.some(index => 
      index.name === 'title_text_artist_text' || // MongoDB typically names text indexes this way
      (index.key && index.key.title === 'text' && index.key.artist === 'text')
    );
    
    if (!textIndexExists) {
      console.log('[DB] Creating text index on title and artist...');
      await collection.createIndex({ title: 'text', artist: 'text' });
    } else {
      console.log('[DB] Text index already exists');
    }
    
    // Test a basic query first to verify connection works
    const countDocs = await collection.countDocuments({});
    console.log(`[DB] Total documents in collection: ${countDocs}`);
    
    // Try both text search approach and regex search for comparison
    console.log(`[DB] Searching for: "${query}"`);
    
    // Perform the text search
    const textResults = await collection
      .find({ $text: { $search: query } }, { projection: { score: { $meta: "textScore" } } })
      .sort({ score: { $meta: "textScore" } })
      .limit(20)
      .toArray();
    console.log(`[DB] Text search results count: ${textResults.length}`);
    
    // If text search returns no results, try a more forgiving regex search as fallback
    let results = textResults;
    if (textResults.length === 0) {
      console.log('[DB] No text search results, trying regex search...');
      const regexResults = await collection
        .find({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { artist: { $regex: query, $options: 'i' } }
          ]
        })
        .limit(20)
        .toArray();
      console.log(`[DB] Regex search results count: ${regexResults.length}`);
      results = regexResults;
    }
    
    return NextResponse.json({
      query,
      results,
      count: results.length,
      success: true,
    });
  } catch (error: any) {
    console.error('[DB] Search error:', error.message);
    return NextResponse.json(
      {
        message: 'Error searching tracks',
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
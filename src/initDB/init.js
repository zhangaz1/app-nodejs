// import mistql from 'mistql';
import R, { T } from 'ramda';
import { getDriver } from './../neo4j.js';
import { popular, similar, latest, ratings } from './../../test/fixtures/movies.js';
import { genres } from './../../test/fixtures/genres.js';
import { people, pacino, roles } from './../../test/fixtures/people.js'

export async function init() {
  let session = null;
  let tx = null;
  try {
    console.log('init db start!');

    const driver = getDriver();
    session = driver.session();
    tx = await session.beginTransaction();

    await tx.run(`MATCH (n) DETACH DELETE n;`);
    await initMovies(tx);
    await initActors(tx);
    await initDirectors(tx);
    await initGenres(tx);
    await initPeople(tx);
    await initPacino(tx);
    await initRoles(tx);
    await initRatings(tx);

    await initActorRS(tx);

    await tx.commit();
    console.log('init db success!');
  } catch (ex) {
    await tx.rollback();
    console.log('init db failed!', ex);
  } finally {
    session && await session.close();
    console.log('init db end!');
  }
}

async function initActorRS(tx) {
  tx.run(`MATCH (m:Movie)
UNWIND m.actors AS actor
MATCH (a:Actor {tmdbId: actor})
MERGE (a)-[:ACTED_IN]->(m);`);

  tx.run(`MATCH (m:Movie)
SET m.actors = null;`);
}

async function initRatings(tx) {
  const query = `UNWIND $batch AS rating
CREATE (r:Rating)
SET r = rating`;
  const rs = R.map(r => R.mergeAll([R.omit(['user'])(r), R.prop('user')(r)]))(ratings);
  tx.run(query, {
    batch: rs
  });
}

async function initRoles(tx) {
  const query = `UNWIND $batch AS role
CREATE (p:Role)
SET p = role`;
  tx.run(query, { batch: roles });
}

async function initPacino(tx) {
  const query = `UNWIND $batch AS pacino
CREATE (p:Pacino)
SET p = pacino`;
  tx.run(query, { batch: pacino });
}

async function initPeople(tx) {
  const query = `UNWIND $batch AS people
CREATE (p:People)
SET p = people`;
  tx.run(query, { batch: people });
}

async function initGenres(tx) {
  const query = `UNWIND $batch AS genre
CREATE (g:Genre)
SET g = genre`;

  const movies = getAllOriginalMovies();
  const mgs = R.pipe(
    R.map(R.prop('genres')),
    R.flatten,
    R.filter(R.identity)
  )
    (movies);

  const allGens = R.pipe(
    R.flatten,
    R.map(R.pick(['name'])),
    R.uniq
  )
    ([mgs, genres]);

  tx.run(query, { batch: allGens });
}

async function initDirectors(tx) {
  const query = `UNWIND $batch AS director
CREATE (d:Director)
SET d = director`;

  const movies = getAllOriginalMovies();
  const directors = R.pipe(
    R.map(R.prop('directors')),
    R.flatten,
    R.filter(R.identity),
    R.uniq
  )
    (movies);

  tx.run(query, { batch: directors });
}

async function initActors(tx) {
  const query = `UNWIND $batch AS actor
CREATE (a:Actor)
SET a = actor`;

  const movies = getAllOriginalMovies();
  const actors = R.pipe(
    R.map(R.prop('actors')),
    R.flatten,
    R.filter(R.identity),
    R.uniq
  )
    (movies);

  tx.run(query, { batch: actors });
}

async function initMovies(tx) {
  const query = `UNWIND $batch AS movie
CREATE (m:Movie)
SET m = movie`;
  const movies = getAllMovies();
  tx.run(query, { batch: movies });
}

function getAllMovies() {
  const movieProperties = ['tmdbId', 'poster', 'title', 'year', 'languages', 'plot', 'imdbRating'];

  const getKeys = prop => arr => R.map(R.prop(prop))(arr || []);

  const getMovie = movie => {
    let m = R.pick(movieProperties, movie);
    m.actors = getKeys('tmdbId')(movie.actors);
    m.directors = getKeys('tmdbId')(movie.directors);
    m.genres = getKeys('name')(movie.genres);
    // console.log(m.actors, m.directors, m.genres, m.languages);
    return m;
  };
  const getMovies = R.map(getMovie);
  const groupByTitle = R.groupBy(R.prop('title'));
  const merge = R.map(R.mergeAll);
  const extract = R.pipe(
    getMovies,
    groupByTitle,
    R.values,
    merge
    /*R.flatten
    R.filter(arr => arr.length > 1)
    merge
    */);

  const originMovies = getAllOriginalMovies();
  const movies = extract(originMovies);

  return movies;
}

function getAllOriginalMovies() {
  return [...popular, ...latest, ...similar];
}

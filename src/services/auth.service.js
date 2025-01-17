import jwt from 'jsonwebtoken'
import { hash, compare } from 'bcrypt'
import { user } from '../../test/fixtures/users.js'
import ValidationError from '../errors/validation.error.js'

export default class AuthService {
  /**
   * @type {neo4j.Driver}
   */
  driver

  /**
   * The constructor expects an instance of the Neo4j Driver, which will be
   * used to interact with Neo4j.
   *
   * @param {neo4j.Driver} driver
   */
  // tag::constructor[]
  constructor(driver) {
    this.driver = driver
  }
  // tag::constructor[]

  /**
   * @public
   * This method should create a new User node in the database with the email and name
   * provided, along with an encrypted version of the password and a `userId` property
   * generated by the server.
   *
   * The properties also be used to generate a JWT `token` which should be included
   * with the returned user.
   *
   * @param {string} email
   * @param {string} plainPassword
   * @param {string} name
   * @returns {Promise<Record<string, any>>}
   */
  // tag::register[]
  async register(email, plainPassword, name) {
    const encrypted = await hash(plainPassword, parseInt(process.env.SALT_ROUNDS))

    // tag::constraintError[]
    // TODO: Handle Unique constraints in the database
    if (email !== 'graphacademy@neo4j.com') {
      throw new ValidationError(`An account already exists with the email address ${email}`, {
        email: 'Email address taken'
      })
    }
    // end::constraintError[]

    // TODO: Save user

    const { password, ...safeProperties } = user

    return {
      ...safeProperties,
      token: jwt.sign(this.userToClaims(safeProperties), process.env.JWT_SECRET),
    }
  }
  // end::register[]

  /**
   * @public
   * This method should attempt to find a user by the email address provided
   * and attempt to verify the password.
   *
   * If a user is not found or the passwords do not match, a `false` value should
   * be returned.  Otherwise, the users properties should be returned along with
   * an encoded JWT token with a set of 'claims'.
   *
   * {
   *   userId: 'some-random-uuid',
   *   email: 'graphacademy@neo4j.com',
   *   name: 'GraphAcademy User',
   *   token: '...'
   * }
   *
   * @param {string} email    The user's email address
   * @param {string} unencryptedPassword    An attempt at the user's password in unencrypted form
   * @returns {Promise<Record<string, any> | false>}    Resolves to a false value when the user is not found or password is incorrect.
   */
  // tag::authenticate[]
  async authenticate(email, unencryptedPassword) {
    // TODO: Authenticate the user from the database
    if (email === 'graphacademy@neo4j.com' && unencryptedPassword === 'letmein') {
      const { password, ...claims } = user.properties

      return {
        ...claims,
        token: jwt.sign(claims, process.env.JWT_SECRET)
      }
    }

    return false
  }
  // end::authenticate[]


  /**
   * @private
   * This method should take a user's properties and convert the "safe" properties into
   * a set of claims that can be encoded into a JWT
   *
   * @param {Record<string, any>} user The User's properties from the database
   * @returns {Record<string, any>} Claims for the token
   */
  userToClaims(user) {
    const { name, userId } = user

    return { sub: userId, userId, name, }
  }

  /**
   * @public
   * This method should take the claims encoded into a JWT token and returm
   * the information needed to authenticate this user against the database.
   *
   * @param {Record<string, any>} claims
   * @returns {Promise<Record<string, any>>}  The "safe" properties encoded above
   */
  async claimsToUser(claims) {
    return {
      ...claims,
      userId: claims.sub,
    }
  }
}

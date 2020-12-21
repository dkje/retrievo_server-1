import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { GraphQLLocalStrategy } from "graphql-passport";
import { getManager } from "typeorm";
import User, { roleTypes } from "../entities/User";
import SocialLogins from "../entities/SocialLogins";
import generateError, {
  errorKeys,
  generateApolloError,
} from "../utils/ErrorFactory";
import { verifyPassword } from "../utils/authUtils";
import { prod } from "../constants";

passport.serializeUser((user: any, done): void => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  if (id) {
    const user = await User.findOne(id);
    return done(null, user);
  }
  return generateError(errorKeys.AUTH_FAIL_DESERIALIZE);
});

passport.use(
  new GraphQLLocalStrategy(
    async (
      email: unknown,
      password: unknown,
      done: (error: Error | null, data: User | null) => void
    ) => {
      const inputEmail = email as string;
      try {
        const user = await User.findOne({ email: inputEmail });

        if (!user)
          return done(generateApolloError(errorKeys.AUTH_NOT_FOUND), null);

        // NOTE 환경변수 prod 에 따라 hash verification 작동여부 판단.
        if (prod) {
          const isVerified = await verifyPassword(
            user.password as string,
            password as string
          );
          if (!isVerified && user.role !== roleTypes.GUEST)
            return done(generateApolloError(errorKeys.AUTH_NOT_MATCH), null);
        }

        if (!prod && user.password !== password)
          return done(generateApolloError(errorKeys.AUTH_NOT_MATCH), null);

        return done(null, user);
      } catch (err) {
        return done(generateApolloError(errorKeys.INTERNAL_SERVER_ERROR), null);
      }
    }
  )
);

/// ///////////////  ///
/// /SocialLogins//  ///
/// ///////////////  ///

const googleOptions = {
  clientID:
    "10963333100-ih0b3mbs9d1la8go1780mqqkobn4ngt5.apps.googleusercontent.com",
  clientSecret: "b3V0_-dXTCSKwsrChG27bG2z",
  callbackURL: "http://localhost:4000/auth/google/callback",
};

const githubOptions = {
  clientID: "9978aef8f4e5e7fb6bfa",
  clientSecret: "5f4d4bb16d38fff555e30f2ab8a5e9dab1bbf7ae",
  callbackURL: "http://localhost:4000/auth/github/callback",
  scope: ["user:email"],
};

const socialCallback = async (
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: any
) => {
  try {
    const socialUser = await SocialLogins.findOne({
      where: { providerId: profile.id },
    });

    const email = profile.emails[0]?.value;
    const hasEmail = await User.findOne({ email });

    if (!socialUser && hasEmail)
      return generateError(errorKeys.AUTH_ALREADY_EXIST);

    if (!socialUser) {
      let username = "";
      if (profile.provider === "github") {
        username = profile.username;
      }
      if (profile.provider === "google") {
        username = `${profile.name.givenName} ${profile.name.familyName}`;
      }

      let newUser;
      const em = getManager();
      await em.transaction(async (transactionalEntityManager) => {
        const tempUser = await em.create(User, {
          username,
          email,
        });
        newUser = await transactionalEntityManager.save(tempUser);

        const newSocialLogin = await em.create(SocialLogins, {
          user: newUser,
          providerId: profile.id,
          socialProvider: profile.provider,
        });
        await transactionalEntityManager.save(newSocialLogin);
      });

      done(null, newUser);
    } else {
      const user = await User.findOne({ where: { email } });
      done(null, user);
    }
  } catch (err) {
    return generateError(errorKeys.INTERNAL_SERVER_ERROR);
  }

  // TODO: invitation 확인 util 실행
  return undefined; // TODO delete
};

passport.use(new GoogleStrategy(googleOptions, socialCallback));
passport.use(new GitHubStrategy(githubOptions, socialCallback));
export default passport;

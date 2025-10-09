import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/user.model.js';

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.providers.push({
        name: 'google',
        id: profile.id,
        avatar: profile.photos[0]?.value || ''
      });
      if (!user.avatar && profile.photos[0]?.value) {
        user.avatar = profile.photos[0].value;
      }
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value || '',
      providers: [{
        name: 'google',
        id: profile.id,
        avatar: profile.photos[0]?.value || ''
      }]
    });
    
    await user.save();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this GitHub ID
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // Check if user exists with same email
    const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
    user = await User.findOne({ email });
    
    if (user) {
      // Link GitHub account to existing user
      user.githubId = profile.id;
      user.providers.push({
        name: 'github',
        id: profile.id,
        avatar: profile.photos[0]?.value || ''
      });
      if (!user.avatar && profile.photos[0]?.value) {
        user.avatar = profile.photos[0].value;
      }
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      githubId: profile.id,
      name: profile.displayName || profile.username,
      email,
      avatar: profile.photos[0]?.value || '',
      providers: [{
        name: 'github',
        id: profile.id,
        avatar: profile.photos[0]?.value || ''
      }]
    });
    
    await user.save();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

export default passport;

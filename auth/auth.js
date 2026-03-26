const jwt = require('jsonwebtoken');

function verifyToken(req, res, next, required, type, userID) {

  const token = req.cookies.token;
  const redirectURL = req.originalUrl;

  if (!token && required)
    return res.status(401).render("auth/login", { 
      title: "Login", 
      error: "Authentication is required to access the resource.",
      redirectURL
    });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (required) {

      if (type == "adminsOnly" && decoded.rank !== "A") 
        return res.status(401).render('forbidden', {title: "Acess Danied"});

      else if (type == "onlySelf" && decoded._id != req.params[userID])
        return res.status(401).render('forbidden', {title: "Acess Danied"});

      else if (type === "adminsAndSelf" && decoded._id !== req.params[userID] && decoded.rank !== "A")
        return res.status(401).render('forbidden', {title: "Acess Danied"});

    }

    req.token = decoded

  } catch (err) {
    if (required) {
      if (err.name === 'TokenExpiredError')
        return res.status(401).render("auth/login", { 
          title: "Login", 
          error: "Authentication expired. Login again.",
          redirectURL 
        });
    
      if (err.name === 'JsonWebTokenError')
        return res.status(401).render("auth/login", {
          title: "Login", 
          error: "Authentication token is not valid.",
          redirectURL 
        });

      return res.status(401).render("auth/login", { 
        title: "Login", 
        error: "Error while verifying token...",
        redirectURL 
      });
    }
  }

  next();
}

module.exports.noToken = async (req, res, next) => verifyToken(req, res, next,false,"","")
module.exports.validateToken = async (req, res, next) => verifyToken(req, res, next,true,"everyone","")
module.exports.validateAdmin = async (req, res, next) => verifyToken(req, res, next,true,"adminsOnly","")

module.exports.validateAdminAndSelf = (param) => {
  return (req, res, next) => {
    verifyToken(req, res, next, true, "adminsAndSelf", param);
  };
};

module.exports.validateSelf = (param) => {
  return (req, res, next) => {
    verifyToken(req, res, next, true, "onlySelf", param);
  };
};

module.exports.validateAccessToResources = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(403).send();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next()
  } catch (err) {
    return res.status(403).send();
  }
}
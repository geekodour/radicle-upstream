import regexparam from "regexparam";
import { DEFAULT_PROJECT_REVISION } from "./config.js";
import { BLOB, TREE } from "./types.js";

export const search = _params => "/search";
export const feed = _params => "/feed";
export const projects = _params => "/projects";
export const projectOverview = (domain, name) =>
  `/projects/${domain}/${name}/overview`;
export const projectFeed = (domain, name) => `/projects/${domain}/${name}/feed`;
export const projectMembers = (domain, name) =>
  `/projects/${domain}/${name}/members`;
export const projectFunds = (domain, name) =>
  `/projects/${domain}/${name}/funds`;
export const projectSource = (domain, name, revision, objectType, path) => {
  if (revision && path) {
    return `/projects/${domain}/${name}/source/${revision}/${objectType}/${path}`;
  } else {
    return `/projects/${domain}/${name}/source`;
  }
};

const PROJECT_SOURCE_PATH_MATCH = new RegExp(
  `/source/(.*)/(${BLOB}|${TREE})/(.*)`
);

export const extractProjectSourceRevision = location => {
  const rev = location.match(PROJECT_SOURCE_PATH_MATCH);
  return rev === null ? DEFAULT_PROJECT_REVISION : rev[1];
};

export const extractProjectSourceObjectPath = location => {
  const path = location.match(PROJECT_SOURCE_PATH_MATCH);
  return path === null ? "/" : path[3];
};

export const extractProjectSourceObjectType = location => {
  const type = location.match(PROJECT_SOURCE_PATH_MATCH);
  return type === null ? TREE : type[2];
};

export const projectCommits = (domain, name) =>
  `/projects/${domain}/${name}/commits`;
export const projectBranches = (domain, name) =>
  `/projects/${domain}/${name}/branches`;

export const designSystem = _params => "/design-system";
export const wallet = _params => "/wallet";
export const profile = _params => "/profile";

export const active = (path, location, loose = false) => {
  return regexparam(path, loose).pattern.test(location);
};
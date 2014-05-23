// Aiming ad Louvain method
// Starting with unweighted, undirected
// see: http://perso.uclouvain.be/vincent.blondel/research/louvain.html
// actually, we start with:
// "Finding community structure in very large networks"
// http://arxiv.org/pdf/cond-mat/0408187.pdf

// ...but as now it is de facto naive modularity maximization


function prepare (nodes, links) {
  var i, source, target;

  // total link weight
  var mass = 0;

  var community_degree = {};
  for (i=0; i<nodes.length; i++) {
    community_degree[i] = 0;
  }

  var intercom_links = {};
  for (i=0; i<nodes.length; i++) {
    intercom_links[i] = {};
  }

  for (i=0; i<links.length; i++) {
    source = links[i].source;
    target = links[i].target;

    // later will be weight
    // we asume non-directed graphs
    mass += 1;
    community_degree[source] += 1;
    community_degree[target] += 1;
    intercom_links[source][target] = 1;
    intercom_links[target][source] = 1;
  }

  return {mass:             mass,
          community_degree: community_degree,
          intercom_links:   intercom_links};
}


// later it will be in an object
function clusterize (mass, community_degree, intercom_links) {
  var k, l;
  var n = 0;
  for (k in community_degree) {
    n += 1;
  }
  var dendrogram = [];
  var queue = [];
  for (k in intercom_links) {
    for (l in intercom_links[k]) {
      d_modularity = (1 / mass) * (intercom_links[k][l] -
                      community_degree[k] * community_degree[l] / (2 * mass));
      if ((k < l) && d_modularity > 0) { // k and l are strings
        queue.push({c1: k, c2: l, d_mod: d_modularity});
      }
    }
  }
  var mod_cmp = function (a, b) {
      return a.d_mod - b.d_mod;
  };
  queue = queue.sort(mod_cmp);

  var c1, c2;

  var to_connect;

  while (queue.length) {
    to_connect = queue.pop();
    c1 = to_connect['c1'];
    c2 = to_connect['c2'];
    if (!((c1 in community_degree) && (c2 in community_degree))) {
      continue;
    }
    dendrogram.push({c1: c1, c2: c2, c_new: n.toString(), m_diff: to_connect['d_mod']});
    community_degree[n] = community_degree[c1] + community_degree[c2];
    delete community_degree[c1];
    delete community_degree[c2];
    intercom_links[n] = sparse_add_within(intercom_links[c1], intercom_links[c2],
                                          community_degree);
    for (k in intercom_links[n]) {
      intercom_links[k][n] = intercom_links[n][k];
    }
    delete intercom_links[c1];
    delete intercom_links[c2];
    for (k in intercom_links[n]){
      d_modularity = (1 / mass) * (intercom_links[n][k] -
                  community_degree[n] * community_degree[k] / (2 * mass));
      if (d_modularity > 0) {
        queue.push({c1: k, c2: n, d_mod: d_modularity});
      }
    }
    queue = queue.sort(mod_cmp);
    // sure, I should use heap instead...
    n++;
  }

  return {dendrogram: dendrogram, community_degree: community_degree};

}


function dendrogram_to_communities (dendrogram, community_degree, nodes) {
  var i, k, conn;

  var which_comm = {};
  i = 0;
  for (k in community_degree) {
    which_comm[k] = i;
    i++;
  }
  // i can avoid community_degree, but I am too lazy
  for (i=dendrogram.length; i--; ) {
    conn = dendrogram[i];
    which_comm[conn.c1] = which_comm[conn.c_new];
    which_comm[conn.c2] = which_comm[conn.c_new];
  }
  var community = [];
  for (i=0; i<nodes.length; i++) {
    community.push(which_comm[i.toString()]);
  }
  return community;
}


function sparse_add (obj1, obj2) {
  var k;
  var res = {};
  for (k in obj1) {
    if (k in obj2) {
      res[k] = obj1[k] + obj2[k];
    } else {
      res[k] = obj1[k];
    }
  }
  for (k in obj2) {
    if (!(k in obj1)) {
      res[k] = obj2[k];
    }
  }
  return res;
}


function sparse_add_within (obj1, obj2, within) {
  var k;
  var res = {};
  for (k in obj1) {
    if (k in within) {
      res[k] = obj1[k];
    }
  }
  for (k in obj2) {
    if (k in within) {
      res[k] = (res[k] || 0) + obj2[k];
    }
  }

  return res;
}


function communitize (graph) {
  var u = prepare(graph.nodes, graph.links);
  var res = clusterize(u.mass, u.community_degree, u.intercom_links);
  var comm = dendrogram_to_communities(res.dendrogram, res.community_degree, graph.nodes);
  for (var i=0; i < graph.nodes.length; i++) {
    graph.nodes[i]['community'] = comm[i];
  }
}

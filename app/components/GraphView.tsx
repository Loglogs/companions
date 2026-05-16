import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Theme } from '../lib/theme';

interface GraphNode {
  id: string;
  label: string;
  path: string;
  group: string;
  linkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Props {
  serverUrl: string;
  token: string;
  theme: Theme;
  onOpenFile: (path: string) => void;
}

const GROUP_COLORS: Record<string, string> = {
  wiki:     '#7C9EFF',
  projects: '#FF9F7C',
  journal:  '#7CFF9E',
  raw:      '#C8A2FF',
};

function buildGraphHtml(nodes: GraphNode[], edges: GraphEdge[], isDark: boolean): string {
  const bg = isDark ? '#111' : '#F5F5F5';
  const labelColor = isDark ? '#ddd' : '#222';

  const nodesJson = JSON.stringify(nodes);
  const edgesJson = JSON.stringify(edges);
  const groupColorsJson = JSON.stringify(GROUP_COLORS);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: ${bg}; touch-action: none; }
  svg { width: 100%; height: 100%; display: block; }
  text { pointer-events: none; user-select: none; fill: ${labelColor}; }
</style>
</head>
<body>
<svg id="svg">
  <g id="container">
    <g id="edges-layer"></g>
    <g id="nodes-layer"></g>
  </g>
</svg>
<script>
(function() {
  var NODES = ${nodesJson};
  var EDGES = ${edgesJson};
  var GROUP_COLORS = ${groupColorsJson};

  // ── layout init ──────────────────────────────────────────────
  var W = window.innerWidth;
  var H = window.innerHeight;

  // Map node id → node object with physics state
  var nodeMap = {};
  var initRadius = Math.min(W, H) * 0.38;
  var GROUP_ORDER = ['wiki', 'projects', 'journal', 'raw'];
  var groupCounts = {};
  var groupIndex = {};
  NODES.forEach(function(n) { groupCounts[n.group] = (groupCounts[n.group] || 0) + 1; });
  GROUP_ORDER.forEach(function(g) { groupIndex[g] = 0; });

  NODES.forEach(function(n) {
    var gOrder = GROUP_ORDER.indexOf(n.group);
    if (gOrder === -1) gOrder = 0;
    var arcStart = (gOrder / GROUP_ORDER.length) * 2 * Math.PI;
    var arcSize = (2 * Math.PI) / GROUP_ORDER.length;
    var total = groupCounts[n.group] || 1;
    var idx = groupIndex[n.group] || 0;
    groupIndex[n.group] = idx + 1;
    var angle = arcStart + (idx / total) * arcSize;
    nodeMap[n.id] = {
      id: n.id,
      label: n.label,
      path: n.path,
      group: n.group,
      linkCount: n.linkCount || 1,
      x: W / 2 + Math.cos(angle) * initRadius + (Math.random() - 0.5) * 30,
      y: H / 2 + Math.sin(angle) * initRadius + (Math.random() - 0.5) * 30,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    };
  });

  var nodeList = Object.values(nodeMap);

  // adjacency for spring
  var edgePairs = [];
  EDGES.forEach(function(e) {
    var s = nodeMap[e.source];
    var t = nodeMap[e.target];
    if (s && t) edgePairs.push([s, t]);
  });

  // ── SVG element creation ──────────────────────────────────────
  var svg = document.getElementById('svg');
  var container = document.getElementById('container');
  var edgesLayer = document.getElementById('edges-layer');
  var nodesLayer = document.getElementById('nodes-layer');

  var NS = 'http://www.w3.org/2000/svg';

  function r(node) {
    var lc = node.linkCount || 1;
    return Math.max(6, Math.min(20, 6 + lc * 1.4));
  }

  function nodeColor(group) {
    return GROUP_COLORS[group] || '#888';
  }

  // Create edge elements
  var edgeEls = edgePairs.map(function(pair) {
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('stroke', '#444');
    line.setAttribute('stroke-opacity', '0.4');
    line.setAttribute('stroke-width', '1');
    edgesLayer.appendChild(line);
    return { el: line, s: pair[0], t: pair[1] };
  });

  // Create node elements (circle + label)
  var nodeEls = {}; // id → { circle, label }
  nodeList.forEach(function(node) {
    var circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('r', r(node));
    circle.setAttribute('fill', nodeColor(node.group));
    circle.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    circle.setAttribute('stroke-width', '1');
    nodesLayer.appendChild(circle);

    var label = document.createElementNS(NS, 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.setAttribute('font-family', 'sans-serif');
    label.textContent = node.label.replace(/\\.md$/, '');
    label.style.display = 'none';
    nodesLayer.appendChild(label);

    nodeEls[node.id] = { circle: circle, label: label };
  });

  // ── Physics simulation ────────────────────────────────────────
  var settled = false;
  var REPULSION = 2200;
  var SPRING_REST = 100;
  var SPRING_K = 0.04;
  var CENTER_K = 0.0008;
  var DAMPING = 0.78;

  function simulate() {
    if (settled) return;

    var repulsion = REPULSION;
    var springK = SPRING_K;
    var centerK = CENTER_K;

    // Repulsion (all pairs — O(n²) but fine for small graphs)
    for (var i = 0; i < nodeList.length; i++) {
      for (var j = i + 1; j < nodeList.length; j++) {
        var a = nodeList[i];
        var b = nodeList[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist2 = dx * dx + dy * dy + 1;
        var dist = Math.sqrt(dist2);
        var force = repulsion / dist2;
        var fx = (dx / dist) * force;
        var fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring attraction along edges
    edgePairs.forEach(function(pair) {
      var s = pair[0], t = pair[1];
      var dx = t.x - s.x;
      var dy = t.y - s.y;
      var dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      var stretch = dist - SPRING_REST;
      var force = springK * stretch;
      var fx = (dx / dist) * force;
      var fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // Centering
    nodeList.forEach(function(node) {
      node.vx += (W / 2 - node.x) * centerK;
      node.vy += (H / 2 - node.y) * centerK;
    });

    // Integrate + dampen; track max velocity to detect settling
    var maxV = 0;
    nodeList.forEach(function(node) {
      if (node.fx !== null) { node.x = node.fx; node.vx = 0; }
      else { node.vx *= DAMPING; node.x += node.vx; }
      if (node.fy !== null) { node.y = node.fy; node.vy = 0; }
      else { node.vy *= DAMPING; node.y += node.vy; }
      var v = node.vx * node.vx + node.vy * node.vy;
      if (v > maxV) maxV = v;
    });
    if (maxV < 0.05) settled = true;
  }

  // ── Pan / Zoom state ──────────────────────────────────────────
  var panX = 0, panY = 0, scale = 1;

  function applyTransform() {
    container.setAttribute('transform',
      'translate(' + panX + ',' + panY + ') scale(' + scale + ')');
    // Show/hide labels based on zoom
    var showLabels = scale > 0.6;
    nodeList.forEach(function(node) {
      var els = nodeEls[node.id];
      if (els) els.label.style.display = showLabels ? '' : 'none';
    });
  }

  // ── DOM update ────────────────────────────────────────────────
  function render() {
    simulate();

    edgeEls.forEach(function(e) {
      e.el.setAttribute('x1', e.s.x);
      e.el.setAttribute('y1', e.s.y);
      e.el.setAttribute('x2', e.t.x);
      e.el.setAttribute('y2', e.t.y);
    });

    nodeList.forEach(function(node) {
      var els = nodeEls[node.id];
      if (!els) return;
      els.circle.setAttribute('cx', node.x);
      els.circle.setAttribute('cy', node.y);
      els.label.setAttribute('x', node.x);
      els.label.setAttribute('y', node.y + r(node) + 12);
    });

    applyTransform();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // ── Touch interaction ─────────────────────────────────────────
  var dragNode = null;
  var touchStartX = 0, touchStartY = 0;
  var panStartX = 0, panStartY = 0;
  var pinchStartDist = 0, pinchStartScale = 1;
  var tapStartX = 0, tapStartY = 0;
  var TAP_THRESHOLD = 8;

  function svgPoint(clientX, clientY) {
    // Convert page coords → SVG local coords accounting for pan/scale
    return {
      x: (clientX - panX) / scale,
      y: (clientY - panY) / scale,
    };
  }

  function hitNode(px, py) {
    for (var i = 0; i < nodeList.length; i++) {
      var node = nodeList[i];
      var dx = node.x - px;
      var dy = node.y - py;
      var rad = r(node) + 6; // touch target is slightly larger
      if (dx * dx + dy * dy <= rad * rad) return node;
    }
    return null;
  }

  function pinchDist(t0, t1) {
    var dx = t0.clientX - t1.clientX;
    var dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  svg.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var touches = e.touches;

    if (touches.length === 2) {
      // Pinch start
      dragNode = null;
      pinchStartDist = pinchDist(touches[0], touches[1]);
      pinchStartScale = scale;
      return;
    }

    if (touches.length === 1) {
      var t = touches[0];
      var pt = svgPoint(t.clientX, t.clientY);
      var hit = hitNode(pt.x, pt.y);
      tapStartX = t.clientX;
      tapStartY = t.clientY;
      if (hit) {
        dragNode = hit;
      } else {
        dragNode = null;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        panStartX = panX;
        panStartY = panY;
      }
    }
  }, { passive: false });

  svg.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var touches = e.touches;

    if (touches.length === 2) {
      var dist = pinchDist(touches[0], touches[1]);
      scale = Math.max(0.2, Math.min(4, pinchStartScale * (dist / pinchStartDist)));
      return;
    }

    if (touches.length === 1) {
      var t = touches[0];
      if (dragNode) {
        var pt = svgPoint(t.clientX, t.clientY);
        dragNode.fx = pt.x;
        dragNode.fy = pt.y;
        dragNode.x = pt.x;
        dragNode.y = pt.y;
      } else {
        panX = panStartX + (t.clientX - touchStartX);
        panY = panStartY + (t.clientY - touchStartY);
      }
    }
  }, { passive: false });

  svg.addEventListener('touchend', function(e) {
    e.preventDefault();
    var changedTouch = e.changedTouches[0];

    if (dragNode) {
      var dx = changedTouch.clientX - tapStartX;
      var dy = changedTouch.clientY - tapStartY;
      var moved = Math.sqrt(dx * dx + dy * dy);
      if (moved < TAP_THRESHOLD) {
        // Tap → open file
        var path = dragNode.path;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openFile', path: path }));
        }
      } else {
        // Keep pinned after drag
        // (fx/fy already set)
      }
      dragNode = null;
    }
  }, { passive: false });

})();
</script>
</body>
</html>`;
}

export default function GraphView({ serverUrl, token, theme, onOpenFile }: Props) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme.bg === '#0D0B08' || theme.bg.startsWith('#0') || theme.bg === '#111';

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const httpBase = serverUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
      const res = await fetch(`${httpBase}/wiki/graph`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data = await res.json() as GraphData;
      setGraphData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [serverUrl, token]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; path: string };
      if (msg.type === 'openFile' && msg.path) {
        onOpenFile(msg.path);
      }
    } catch {}
  }, [onOpenFile]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.textDim} size="large" />
        <Text style={[styles.hint, { color: theme.textDim }]}>Building graph…</Text>
      </View>
    );
  }

  if (error || !graphData) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.textDim }]}>{error ?? 'No data'}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: theme.border }]}
          onPress={fetchGraph}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryLabel, { color: theme.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const html = buildGraphHtml(graphData.nodes, graphData.edges, isDark);

  return (
    <WebView
      style={{ flex: 1, backgroundColor: isDark ? '#111' : '#F5F5F5' }}
      source={{ html }}
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      originWhitelist={['*']}
      javaScriptEnabled={true}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
});

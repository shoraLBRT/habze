#!/usr/bin/env bash
# The habze conformance check: does one repository follow STANDARD.md?
#
#   tools/conformance.sh <owner/name>
#
# Prints one line per requirement (PASS, FAIL with its fix, WARN, MANUAL, INFO) and exits 1 when any
# requirement fails, 2 when the repository cannot be read. Needs only `gh`, authenticated with the
# `repo` and `read:project` scopes, and standard shell tools; runs in bash on Linux and in Git Bash
# on Windows.
#
# Limits: it reads the board's first 1000 items (and the first 100 for the order of A2), all open
# issues, and the last 100 pull requests.

set -u

# Released versions of STANDARD.md (V1). Add the new one with every release, and teach the checks
# below which requirements each version holds (V2).
STANDARD_VERSIONS="1.0"
LATEST_VERSION="1.0"
HABZE_URL="https://github.com/shoraLBRT/habze"
LABELS="type:feature type:infra type:docs type:research type:qa type:security type:tech-debt
type:bug needs:maintainer accepted"

if [ $# -ne 1 ] || [[ $1 != */* ]]; then
  echo "usage: $0 <owner/name>" >&2
  exit 2
fi
R=$1
OWNER=${R%%/*}
NAME=${R#*/}

npass=0 nfail=0 nwarn=0
say() { # status id message [fix]
  printf '%-6s %-3s %s\n' "$1" "$2" "$3"
  if [ -n "${4:-}" ]; then printf '           fix: %s\n' "$4"; fi
  case $1 in PASS) npass=$((npass + 1)) ;; FAIL) nfail=$((nfail + 1)) ;; WARN) nwarn=$((nwarn + 1)) ;; esac
}
pass() { say PASS "$@"; }
fail() { say FAIL "$@"; }
warn() { say WARN "$@"; }
manual() { say MANUAL "$@"; }
info() { say INFO "$@"; }
join() { # lines -> "a, b, c", at most ten of them
  awk 'NF { n++; if (n <= 10) o = o (n > 1 ? ", " : "") $0 }
    END { if (n > 10) o = o ", … and " (n - 10) " more"; printf "%s", o }'
}

# --- The repository ---------------------------------------------------------------------------

DEF=$(gh api "repos/$R" --jq .default_branch 2>/dev/null | tr -d '\r')
if [ -z "$DEF" ]; then
  echo "cannot read $R with gh (does it exist, and is gh logged in?)" >&2
  exit 2
fi
TREE=$(gh api "repos/$R/git/trees/$DEF?recursive=1" --jq '.tree[].path' 2>/dev/null | tr -d '\r')

has() { grep -qxF -- "$1" <<<"$TREE"; } # a file or directory on the default branch
raw() { has "$1" && gh api -H "Accept: application/vnd.github.raw+json" \
  "repos/$R/contents/$1?ref=$DEF" 2>/dev/null | tr -d '\r'; }

# The relative link targets of the Markdown on stdin, without anchors. Code blocks and code spans
# are skipped; so are external links and pure anchors.
links() {
  awk '/^[ \t]*(```|~~~)/ { f = !f; next } !f' |
    sed -E 's/``([^`]|`[^`])*``//g; s/`[^`]*`//g' |
    grep -oE '\]\([^) ]+|^[[:space:]]*\[[^]]+\]:[[:space:]]*[^[:space:]]+' |
    sed -E 's/^\]\(//; s/^[[:space:]]*\[[^]]+\]:[[:space:]]*//; s/^<//; s/>$//; s/#.*//' |
    grep -vE '^([a-zA-Z][a-zA-Z0-9+.-]*:|//|$)'
}

# A link target resolved against a directory ("" for the root) to a repository path.
resolve() {
  local p
  case $2 in /*) p=${2#/} ;; *) p=${1:+$1/}$2 ;; esac
  awk -v p="$p" 'BEGIN {
    n = split(p, a, "/"); k = 0
    for (i = 1; i <= n; i++) {
      if (a[i] == "" || a[i] == ".") continue
      if (a[i] == "..") { if (k > 0) k--; continue }
      s[++k] = a[i]
    }
    o = ""; for (i = 1; i <= k; i++) o = o (i > 1 ? "/" : "") s[i]; print o
  }'
}

doc_links() { # path -> resolved targets of its relative links
  local dir
  dir=$(dirname "$1")
  [ "$dir" = . ] && dir=""
  raw "$1" | links | while read -r t; do resolve "$dir" "$t"; done
}

MILESTONES=$(gh api "repos/$R/milestones?state=all&per_page=100" --paginate --jq '.[].title' \
  2>/dev/null | tr -d '\r')

# --- Part A §1: documents ---------------------------------------------------------------------

CLAUDE=$(raw CLAUDE.md)
CLAUDE_LINKS=$(doc_links CLAUDE.md)
DESC=$(grep -E '^docs/[^/]+\.md$' <<<"$CLAUDE_LINKS" | grep -vxE 'docs/(ROADMAP|PROJECT_STATE)\.md' |
  while read -r d; do has "$d" && echo "$d"; done | head -1)
V=$(grep -oE 'follows \[habze\]\([^)]+\) `[0-9]+\.[0-9]+`' <<<"$CLAUDE" | head -1 |
  grep -oE '[0-9]+\.[0-9]+`$' | tr -d '`')

echo "habze conformance check: $R (default branch $DEF)"
if [ -n "$V" ] && grep -qw -- "$V" <<<"$STANDARD_VERSIONS"; then
  echo "checked against STANDARD $V, the version CLAUDE.md names (V2)"
else
  echo "checked against STANDARD $LATEST_VERSION: CLAUDE.md names no released version (D2)"
  V=$LATEST_VERSION
fi
echo

if [ -n "$(raw README.md)" ]; then
  pass D1 "README.md exists and is not empty"
else
  fail D1 "README.md is missing or empty" "add a README.md saying what the project is and how to run it"
fi

if ! has CLAUDE.md; then
  fail D2 "CLAUDE.md is missing" \
    "add CLAUDE.md linking AGENTS.md, docs/ROADMAP.md, docs/PROJECT_STATE.md and the product description, with the line: This project follows [habze]($HABZE_URL) \`$LATEST_VERSION\`."
else
  problems=()
  for l in AGENTS.md docs/ROADMAP.md docs/PROJECT_STATE.md; do
    if ! grep -qxF "$l" <<<"$CLAUDE_LINKS"; then problems+=("no link to $l")
    elif ! has "$l"; then problems+=("$l is linked but missing"); fi
  done
  [ -z "$DESC" ] && problems+=("no link to a product description under docs/ (D4)")
  line=$(grep -oE 'follows \[habze\]\([^)]+\) `[0-9]+\.[0-9]+`' <<<"$CLAUDE" | head -1)
  if [ -z "$line" ]; then problems+=("no line naming the standard's version")
  elif ! grep -qw -- "$(grep -oE '[0-9]+\.[0-9]+`$' <<<"$line" | tr -d '`')" <<<"$STANDARD_VERSIONS"; then
    problems+=("the version it names is not a released one ($STANDARD_VERSIONS)")
  fi
  if [ ${#problems[@]} -eq 0 ]; then
    pass D2 "CLAUDE.md links the entry documents and names STANDARD $V"
  else
    fail D2 "CLAUDE.md: $(printf '%s\n' "${problems[@]}" | join)" \
      "add any missing link, and the line: This project follows [habze]($HABZE_URL) \`$LATEST_VERSION\`."
  fi
fi

AGENTS=$(raw AGENTS.md)
if ! has AGENTS.md; then
  fail D3 "AGENTS.md is missing" \
    "add AGENTS.md with the sections ## Non-negotiables, ## Working rules, ## Where the work comes from"
else
  missing=$(for h in "Non-negotiables" "Working rules" "Where the work comes from"; do
    grep -qiE "^## +$h *\$" <<<"$AGENTS" || echo "## $h"
  done | join)
  if [ -z "$missing" ]; then pass D3 "AGENTS.md has the three sections"
  else fail D3 "AGENTS.md lacks: $missing" "add those sections"; fi
fi

if [ -n "$DESC" ]; then
  pass D4 "product description: $DESC, linked from CLAUDE.md"
else
  fail D4 "CLAUDE.md links no existing docs/*.md other than ROADMAP.md and PROJECT_STATE.md" \
    "write the product description (for example docs/SPEC.md) and link it from CLAUDE.md"
fi

ROADMAP=$(raw docs/ROADMAP.md)
if ! has docs/ROADMAP.md; then
  fail D5 "docs/ROADMAP.md is missing" "add it, naming every stage with its goal and exit criterion"
else
  missing=$(while read -r m; do [ -n "$m" ] && ! grep -qF -- "$m" <<<"$ROADMAP" && echo "$m"; done \
    <<<"$MILESTONES" | join)
  words=$(for w in Goal "Exit criterion"; do grep -qi -- "$w" <<<"$ROADMAP" || echo "$w"; done | join)
  if [ -z "$missing$words" ]; then pass D5 "docs/ROADMAP.md names every stage, with goal and exit criterion"
  else fail D5 "docs/ROADMAP.md lacks: ${missing:+stages $missing}${missing:+${words:+; }}${words:+the words $words}" \
    "name every milestone in the roadmap with its Goal and Exit criterion"; fi
fi

STATE=$(raw docs/PROJECT_STATE.md)
if ! has docs/PROJECT_STATE.md; then
  fail D6 "docs/PROJECT_STATE.md is missing" "add it with 'Last updated:' and 'Current stage:' lines"
else
  problems=()
  grep -qE 'Last updated:[^0-9]*[0-9]{4}-[0-9]{2}-[0-9]{2}' <<<"$STATE" ||
    problems+=("no 'Last updated:' date YYYY-MM-DD")
  stage=$(grep -m1 'Current stage:' <<<"$STATE")
  if [ -z "$stage" ]; then problems+=("no 'Current stage:' line")
  else
    after=${stage#*Current stage:}
    named=$(while read -r m; do [ -n "$m" ] && grep -qF -- "$m" <<<"$after" && echo "$m"; done <<<"$MILESTONES")
    [ -z "$named" ] && problems+=("'Current stage:' names no milestone")
  fi
  if [ ${#problems[@]} -eq 0 ]; then pass D6 "docs/PROJECT_STATE.md has its date and current stage"
  else fail D6 "docs/PROJECT_STATE.md: $(printf '%s\n' "${problems[@]}" | join)" \
    "add 'Last updated: YYYY-MM-DD' and 'Current stage: <milestone title>'"; fi
fi

# The commands of D7: fenced lines of the Verification section, continuations joined.
VERIFY=$(awk '/^## / { s = ($0 ~ /^## +Verification *$/) } s' <<<"$STATE")
COMMANDS=$(awk '/^[ \t]*(```|~~~)/ { f = !f; next }
  f { if (c != "") { $0 = c " " $0; c = "" }
      if ($0 ~ /\\$/) { sub(/\\$/, ""); c = $0; next }
      if ($0 ~ /^[ \t]*(#|$)/) next
      print }' <<<"$VERIFY")
if [ -z "$VERIFY" ]; then
  fail D7 "docs/PROJECT_STATE.md has no ## Verification section" \
    "add it, with the commands that verify a change in fenced code blocks"
elif ! grep -qE '^[[:space:]]*(```|~~~)' <<<"$VERIFY"; then
  fail D7 "## Verification has no fenced code block" "put the verification commands in fenced code blocks"
else
  pass D7 "## Verification lists $(grep -c . <<<"$COMMANDS") command(s)"
fi

broken=$(for d in README.md CLAUDE.md AGENTS.md $DESC docs/ROADMAP.md docs/PROJECT_STATE.md; do
  has "$d" || continue
  doc_links "$d" | while read -r t; do has "$t" || echo "$d -> $t"; done
done | sort -u | join)
if [ -z "$broken" ]; then pass D8 "every relative link in those documents resolves (anchors not checked)"
else fail D8 "broken relative links: $broken" "fix or remove them"; fi

# --- Part A §2: backlog -----------------------------------------------------------------------

BOARDS=$(gh api graphql -f query='query($o:String!,$n:String!){repository(owner:$o,name:$n){
  projectsV2(first:10){nodes{number url}}}}' -f o="$OWNER" -f n="$NAME" \
  --jq '.data.repository.projectsV2.nodes[] | "\(.number) \(.url)"' 2>&1 | tr -d '\r')
BOARD="" BOARD_OWNER="" BOARD_KIND=""
if grep -qiE 'error|scope|resource not accessible' <<<"$BOARDS"; then
  fail B1 "cannot read the repository's boards: $(head -1 <<<"$BOARDS")" \
    "gh auth refresh -s read:project"
else
  while read -r num url; do
    [ -n "$url" ] && grep -qF -- "$url" <<<"$AGENTS" && { BOARD=$num; BOARD_URL=$url; break; }
  done <<<"$BOARDS"
  if [ -n "$BOARD" ]; then
    BOARD_KIND=$(sed -E 's#^https://github.com/(users|orgs)/.*#\1#' <<<"$BOARD_URL")
    BOARD_OWNER=$(sed -E 's#^https://github.com/(users|orgs)/([^/]+)/.*#\2#' <<<"$BOARD_URL")
    pass B1 "board $BOARD_URL is linked to the repository and to AGENTS.md"
  elif [ -z "$BOARDS" ]; then
    fail B1 "no GitHub Projects board is linked to the repository" \
      "create a board, link it to the repository, and link its URL from AGENTS.md"
  else
    fail B1 "no linked board's URL appears in AGENTS.md" "link the board from AGENTS.md"
  fi
fi

if [ -z "$BOARD" ]; then
  for id in B2 B3; do fail $id "cannot be checked without a board (B1)" "fix B1"; done
else
  problems=()
  for spec in "Status:Todo,In Progress,Done" "Priority:P0,P1,P2" "Size:XS,S,M,L,XL"; do
    f=${spec%%:*}
    got=$(gh project field-list "$BOARD" --owner "$BOARD_OWNER" --format json \
      --jq ".fields[] | select(.name==\"$f\") | [.options[].name] | join(\",\")" 2>/dev/null | tr -d '\r')
    [ "$got" = "${spec#*:}" ] || problems+=("$f is '${got:-missing}', not '${spec#*:}'")
  done
  if [ ${#problems[@]} -eq 0 ]; then pass B2 "the board has Status, Priority and Size with the right options"
  else fail B2 "board fields: $(printf '%s\n' "${problems[@]}" | join)" \
    "set the single-select fields to exactly those options"; fi

  enabled=$(gh api graphql -f query='query($o:String!,$b:Int!){repositoryOwner(login:$o){
    ... on ProjectV2Owner{projectV2(number:$b){workflows(first:20){nodes{name enabled}}}}}}' \
    -f o="$BOARD_OWNER" -F b="$BOARD" \
    --jq '.data.repositoryOwner.projectV2.workflows.nodes[] | select(.enabled) | .name' 2>/dev/null |
    tr -d '\r')
  missing=$(for w in "Item closed" "Pull request merged"; do
    grep -qxF "$w" <<<"$enabled" || echo "$w"; done | join)
  if [ -z "$missing" ]; then pass B3 "the board's workflows Item closed and Pull request merged are on"
  else fail B3 "board workflows not enabled: $missing" "enable them in the board's Workflows settings"; fi
fi

if [ -z "$MILESTONES" ]; then
  fail B4 "the repository has no milestones" "create the stages as milestones titled 'S0 · <name>', …"
else
  bad=$(grep -vE '^S[0-9]+ · .+$' <<<"$MILESTONES" | join)
  if [ -z "$bad" ]; then pass B4 "every milestone is titled 'S<n> · <name>'"
  else fail B4 "milestones not titled 'S<n> · <name>': $bad" "rename them"; fi
fi

# One line per open issue: number, in a milestone, type labels, bad title, I4 body, missing deps.
ISSUES=$(gh api graphql --paginate -f o="$OWNER" -f n="$NAME" -f query='
query($o:String!,$n:String!,$endCursor:String){repository(owner:$o,name:$n){
  issues(states:OPEN,first:50,after:$endCursor){pageInfo{hasNextPage endCursor}
    nodes{number title body milestone{title} labels(first:30){nodes{name}}
      blockedBy(first:50){nodes{number}}}}}}' --jq '
  def lines: gsub("\r"; "") | split("\n");
  def at($re): [lines | to_entries[] | select(.value | test($re)) | .key];
  def section($name): reduce lines[] as $l ({in: false, out: []};
    if ($l | test("^#{1,6}\\s")) then .in = ($l | test("^#{1,6}\\s+" + $name + "\\s*$"; "i"))
    elif .in then .out += [$l] else . end) | .out | join("\n");
  .data.repository.issues.nodes[]
  | (.body // "") as $b
  | ([$b | at("^#{2,3}\\s+Why\\s*$"), at("^#{2,3}\\s+What\\s*$"),
           at("^#{2,3}\\s+Acceptance criteria\\s*$")]) as $h
  | (if ($h | map(length > 0) | all)
     then ($h | flatten | max) as $last
       | ([$b | at("^\\s*- \\[[ xX]\\]")[] | select(. > $last)] | length > 0)
     else false end) as $i4
  | ([$b | section("Depends on") | scan("(?:^|[^A-Za-z0-9_/])#([0-9]+)") | .[0] | tonumber]
     - [.blockedBy.nodes[].number] | unique | map(tostring) | join(" ")) as $deps
  | [.number, (if .milestone then 1 else 0 end),
     ([.labels.nodes[].name | select(startswith("type:"))] | length),
     (if (.title | test("^\\s*(\\[[^\\]]+\\]|[A-Za-z-]+(\\([^)]*\\))?!?:)")) then 1 else 0 end),
     (if $i4 then 1 else 0 end), $deps] | map(tostring) | join("\t")' 2>/dev/null | tr -d '\r')
col() { awk -F'\t' "$1" <<<"$ISSUES"; }

bad=$(col '$2 == 0 { print "#" $1 }' | join)
if [ -z "$bad" ]; then pass B5 "every open issue is in a milestone"
else fail B5 "open issues without a milestone: $bad" "put each in its stage"; fi

if [ -z "$BOARD" ]; then
  fail B6 "cannot be checked without a board (B1)" "fix B1"
else
  ON_BOARD=$(gh project item-list "$BOARD" --owner "$BOARD_OWNER" --format json --limit 1000 \
    --jq ".items[] | select(.content.repository==\"$R\") | .content.number" 2>/dev/null | tr -d '\r')
  bad=$(col '{ print $1 }' | while read -r n; do grep -qx "$n" <<<"$ON_BOARD" || echo "#$n"; done | join)
  if [ -z "$bad" ]; then pass B6 "every open issue is on the board"
  else fail B6 "open issues not on the board: $bad" "add them to the board"; fi
fi

bad=$(col '$6 != "" { n = split($6, d, " "); s = ""; for (i = 1; i <= n; i++) s = s (i > 1 ? " " : "") "#" d[i]
  print "#" $1 " (" s ")" }' | join)
if [ -z "$bad" ]; then pass B7 "every '#N' under 'Depends on' is a native blocked-by relation"
else fail B7 "dependencies written but not related: $bad" "add each as a 'blocked by' relation"; fi

LABELS_NOW=$(gh label list -R "$R" --limit 500 --json name --jq '.[].name' 2>/dev/null | tr -d '\r')
bad=$(grep -iE '^(p[0-9]\b|priority)' <<<"$LABELS_NOW" | join)
if [ -z "$bad" ]; then pass B8 "no label carries a priority"
else fail B8 "priority labels: $bad" "delete them; priority is the board's Priority field"; fi

# --- Part A §3: issues ------------------------------------------------------------------------

missing=$(for l in $LABELS; do grep -qxF "$l" <<<"$LABELS_NOW" || echo "$l"; done | join)
if [ -z "$missing" ]; then pass I1 "the standard's ten labels exist"
else fail I1 "missing labels: $missing" "create them from habze's .github/labels.yml"; fi

bad=$(col '$2 == 1 && $3 != 1 { print "#" $1 " (" $3 ")" }' | join)
if [ -z "$bad" ]; then pass I2 "every open issue in a milestone has exactly one type:* label"
else fail I2 "issues without exactly one type:* label (count): $bad" "give each one type:* label"; fi

bad=$(col '$4 == 1 { print "#" $1 }' | join)
if [ -z "$bad" ]; then pass I3 "no open issue title has a type prefix"
else fail I3 "titles with a type prefix: $bad" "retitle them; the type is the label"; fi

# Issue forms render each field as a ### heading, so ## and ### both count as the section.
bad=$(col '$2 == 1 && $5 == 0 { print "#" $1 }' | join)
if [ -z "$bad" ]; then pass I4 "every open issue in a milestone has Why, What and a checklist of Acceptance criteria"
else fail I4 "issues lacking ## Why / ## What / ## Acceptance criteria with a checklist: $bad" \
  "edit their bodies into those sections"; fi

FORMS=$(grep -E '^\.github/ISSUE_TEMPLATE/[^/]+\.ya?ml$' <<<"$TREE" | grep -vE '/config\.ya?ml$')
if [ -z "$FORMS" ]; then
  fail I5 "no issue forms in .github/ISSUE_TEMPLATE/" "copy habze's issue forms"
else
  bad=$(while read -r f; do
    body=$(raw "$f")
    for l in Why What "Acceptance criteria" "Depends on"; do
      grep -qE "^[[:space:]]*label:[[:space:]]*[\"']?$l[\"']?[[:space:]]*\$" <<<"$body" || {
        echo "$f"
        break
      }
    done
  done <<<"$FORMS" | join)
  if [ -z "$bad" ]; then pass I5 "$(grep -c . <<<"$FORMS") issue form(s), each with Why, What, Acceptance criteria, Depends on"
  else fail I5 "forms without all four fields: $bad" "add the missing fields, or copy habze's forms"; fi
fi

if has .github/pull_request_template.md; then pass I6 ".github/pull_request_template.md exists"
else fail I6 ".github/pull_request_template.md is missing" "copy habze's PR template"; fi

# --- Part A §4: branches, pull requests and CI --------------------------------------------------

REQUIRED="" problems=()
classic=$(gh api "repos/$R/branches/$DEF/protection" --jq '
  [(.required_pull_request_reviews != null),
   (([.required_status_checks.contexts[]?, .required_status_checks.checks[]?.context] | length) > 0),
   (.allow_force_pushes.enabled == false), (.allow_deletions.enabled == false)]
  | map(tostring) | join(" ")' 2>/dev/null | tr -d '\r')
rules=$(gh api "repos/$R/rules/branches/$DEF" --jq '.[].type' 2>/dev/null | tr -d '\r')
if [ "$classic" = "true true true true" ]; then
  REQUIRED=$(gh api "repos/$R/branches/$DEF/protection" --jq \
    '[.required_status_checks.contexts[]?, .required_status_checks.checks[]?.context] | unique | .[]' |
    tr -d '\r')
  pass P1 "$DEF is protected: pull requests, required checks, no force pushes, no deletion"
else
  for t in pull_request required_status_checks non_fast_forward deletion; do
    grep -qx "$t" <<<"$rules" || problems+=("$t")
  done
  if [ ${#problems[@]} -eq 0 ]; then
    REQUIRED=$(gh api "repos/$R/rules/branches/$DEF" --jq '.[] | select(.type=="required_status_checks")
      | .parameters.required_status_checks[].context' | sort -u | tr -d '\r')
    pass P1 "$DEF is protected by rules: pull_request, required_status_checks, non_fast_forward, deletion"
  else
    fail P1 "$DEF is not protected as required$([ -z "$classic$rules" ] && echo " (no protection or rules)")" \
      "protect it: changes only through pull requests, the CI jobs as required checks, no force pushes, no deletion"
  fi
fi

WORKFLOWS=$(grep -E '^\.github/workflows/[^/]+\.ya?ml$' <<<"$TREE")
WF_TEXT=$(while read -r f; do [ -n "$f" ] && raw "$f"; done <<<"$WORKFLOWS")
# Scripts a workflow runs count as part of CI (P3).
WF_TEXT+=$'\n'$(grep -E '\.(sh|bash|ps1|py|js|mjs|cjs)$|(^|/)Makefile$' <<<"$TREE" |
  while read -r f; do grep -qF -- "$f" <<<"$WF_TEXT" && raw "$f"; done)
if ! grep -qwE 'pull_request' <<<"$WF_TEXT"; then
  fail P2 "no workflow in .github/workflows/ runs on pull_request" "add a CI workflow triggered by pull_request"
elif [ -z "$REQUIRED" ]; then
  fail P2 "a workflow runs on pull requests, but there are no required checks to match (P1)" "fix P1"
else
  last=$(gh pr list -R "$R" --state merged --limit 1 --json number --jq '.[0].number' 2>/dev/null | tr -d '\r')
  ran=$([ -n "$last" ] && gh pr checks "$last" -R "$R" --json name --jq '.[].name' 2>/dev/null | tr -d '\r')
  missing=$(while read -r c; do grep -qxF -- "$c" <<<"$ran" || echo "$c"; done <<<"$REQUIRED" | join)
  if [ -z "$missing" ]; then pass P2 "the required checks ($(join <<<"$REQUIRED")) ran on the latest merged PR"
  else fail P2 "required checks that did not run on the latest merged PR${last:+ #$last}: $missing" \
    "make the required checks the CI workflow's jobs"; fi
fi

squash() { tr -s '[:space:]' ' '; }
WF_FLAT=$(squash <<<"$WF_TEXT")
bad=$(grep -vE '#[[:space:]]*local only[[:space:]]*$' <<<"$COMMANDS" | while read -r c; do
  [ -n "$c" ] && ! grep -qF -- "$(squash <<<"$c" | sed 's/ $//')" <<<"$WF_FLAT" && echo "$c"
done)
if [ -z "$COMMANDS" ]; then fail P3 "no verification commands to compare (D7)" "fix D7"
elif [ -z "$bad" ]; then pass P3 "CI runs every verification command not marked '# local only'"
else fail P3 "commands CI does not run: $(join <<<"$bad")" \
  "run them in a workflow, or end the ones that cannot run in CI with '# local only'"; fi

PRS=$(gh api graphql -f o="$OWNER" -f n="$NAME" -f query='
query($o:String!,$n:String!){repository(owner:$o,name:$n){pullRequests(last:100){nodes{
  number state headRefName title body mergedBy{login}
  closingIssuesReferences(first:10){nodes{number}} files(first:100){nodes{path}}}}}}' --jq '
  .data.repository.pullRequests.nodes[]
  | [.number, .state, .headRefName, (.mergedBy.login // ""),
     ([.closingIssuesReferences.nodes[].number] | map(tostring) | join(" ")),
     ([(.title + " " + (.body // "")) | scan("#([0-9]+)") | .[0]] | unique | join(" ")),
     (if any(.files.nodes[].path; test("^(\\.github/workflows/|\\.claude/|CLAUDE\\.md$|AGENTS\\.md$|\\.github/labels\\.yml$|\\.github/ISSUE_TEMPLATE/|\\.github/pull_request_template\\.md$)")) then 1 else 0 end)]
  | map(tostring) | join("\t")' 2>/dev/null | tr -d '\r')

bad=$(awk -F'\t' '$2 == "MERGED" && split($5, c, " ") > 1 { print "#" $1 " (" $5 ")" }' <<<"$PRS" | join)
if [ -z "$bad" ]; then pass P4 "no merged PR closes more than one issue (last 100 PRs)"
else warn P4 "merged PRs closing more than one issue, for the owner to confirm: $bad"; fi

bad=$(awk -F'\t' '$3 ~ /^claude\// {
    if ($3 !~ /^claude\/[0-9]+-[a-z0-9][a-z0-9-]*$/) { print "#" $1 " " $3; next }
    n = $3; sub(/^claude\//, "", n); sub(/-.*/, "", n)
    if ((" " $5 " " $6 " ") !~ (" " n " ")) print "#" $1 " " $3 " (does not name #" n ")"
  }' <<<"$PRS" | join)
if [ -z "$bad" ]; then pass P5 "every claude/* branch is claude/<issue>-<slug> for the issue its PR names"
else fail P5 "PRs with a claude/* branch that breaks the rule: $bad" \
  "name agent branches claude/<issue>-<slug> after the issue the PR closes or references"; fi

bad=$(awk -F'\t' -v o="$OWNER" '$2 == "MERGED" && $7 == 1 && $4 != o { print "#" $1 " (" $4 ")" }' <<<"$PRS" |
  join)
if [ -z "$bad" ]; then
  pass P6 "every merged PR touching protected paths was merged by $OWNER (an agent on the owner's token looks the same)"
else fail P6 "PRs touching protected paths merged by someone else: $bad" \
  "only $OWNER merges changes to protected paths"; fi

# --- Part B: agents ---------------------------------------------------------------------------

if [ -n "$BOARD" ]; then
  root=$([ "$BOARD_KIND" = orgs ] && echo organization || echo user)
  next=$(gh api graphql -f o="$BOARD_OWNER" -F b="$BOARD" -f query="
query(\$o:String!,\$b:Int!){ $root(login:\$o){ projectV2(number:\$b){
  items(first:100, orderBy:{field:POSITION, direction:ASC}){ nodes{
    status: fieldValueByName(name:\"Status\"){ ... on ProjectV2ItemFieldSingleSelectValue{name} }
    priority: fieldValueByName(name:\"Priority\"){ ... on ProjectV2ItemFieldSingleSelectValue{name} }
    content{ ... on Issue{ number state repository{nameWithOwner} author{login} milestone{title}
      labels(first:30){nodes{name}} blockedBy(first:50){nodes{state}} }}
  }}}}}" --jq "
  [.data[].projectV2.items.nodes | to_entries[] | .value + {pos: .key}
   | select(.content.repository.nameWithOwner == \"$R\")
   | select(.content.state == \"OPEN\" and .status.name == \"Todo\")
   | select(.content.author.login == \"$OWNER\" or ([.content.labels.nodes[].name] | index(\"accepted\")))
   | select(.content.milestone != null)
   | select([.content.blockedBy.nodes[] | select(.state == \"OPEN\")] | length == 0)
   | select([.content.labels.nodes[].name] | index(\"needs:maintainer\") | not)]
  | sort_by([.content.milestone.title, ({\"P0\":0,\"P1\":1,\"P2\":2}[.priority.name // \"\"] // 3), .pos])
  | .[] | \"#\(.content.number)\"" 2>/dev/null | tr -d '\r')
  if [ -n "$next" ]; then info A1 "eligible issues, in order (A2): $(join <<<"$next")"
  else info A1 "no eligible issue (A1, A2)"; fi
else
  info A1 "eligibility and order need a board (B1)"
fi
manual A3 "the trust rule is upheld by the skills; review their source"

bad=$(gh issue list -R "$R" --state open --label needs:maintainer --json number --jq '.[].number' 2>/dev/null |
  tr -d '\r' | while read -r n; do
    [ -n "$n" ] || continue
    events=$(gh api "repos/$R/issues/$n/timeline?per_page=100" --paginate --jq '.[]
      | select((.event == "labeled" and .label.name == "needs:maintainer") or .event == "commented")
      | "\(.event) \(.created_at)"' 2>/dev/null | tr -d '\r')
    labeled=$(grep '^labeled ' <<<"$events" | tail -1 | cut -d' ' -f2)
    awk -v t="$labeled" '$1 == "commented" && $2 >= t { f = 1 } END { exit !f }' <<<"$events" || echo "#$n"
  done | join)
if [ -z "$bad" ]; then pass A4 "every open needs:maintainer issue has a comment after the label"
else fail A4 "needs:maintainer issues without a comment after the label: $bad" \
  "comment on each with the question, the options and a recommendation"; fi
info A5 "checked as P4"
info A6 "checked as P6"
info V2 "requirements of STANDARD $V checked; V1 concerns habze's own STANDARD.md"

echo
echo "$npass passed, $nfail failed, $nwarn warnings"
[ "$nfail" -eq 0 ]

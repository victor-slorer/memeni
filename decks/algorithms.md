---
schema: 1
topic: algorithms-and-data-structures
---

### written
What is the worst-case time complexity of quicksort?
- answer: O(n^2) | O(n²) | n^2 | n² | quadratic
- explain: It happens when the pivot is always the smallest or largest element (e.g. first-element pivot on sorted input); random pivots make this very unlikely.

### written
Which algorithm finds single-source shortest paths when all edge weights are non-negative?
- answer: Dijkstra | Dijkstra's | Dijkstra's algorithm | Dijkstras
- explain: It repeatedly finalises the closest unvisited node using a priority queue, O((V + E) log V) with a binary heap; negative edges break that greedy step (use Bellman-Ford).

### multiple
Which sorting algorithms run in O(n log n) time in the worst case?
- correct: Merge sort | Heap sort
- wrong: Quick sort | Insertion sort | Bubble sort
- explain: Merge sort always splits in half and heap sort does n extractions of O(log n) each; quick, insertion and bubble sort are O(n²) in the worst case.

### truefalse
BFS finds shortest paths in an unweighted graph.
- answer: true
- explain: BFS visits nodes in order of their distance (number of edges) from the start, so the first time it reaches a node is along a shortest path.

### written
What is the technique of solving overlapping subproblems once and reusing their results called?
- answer: dynamic programming | DP | memoization | memoisation
- explain: Each subproblem is computed once, either top-down with a cache or bottom-up in a table, e.g. Fibonacci goes from exponential to O(n).

### written
Which data structure does an iterative depth-first search use?
- answer: stack | a stack | LIFO stack
- explain: DFS goes as deep as possible before backtracking, which is exactly what a LIFO stack gives you (recursive DFS uses the call stack); BFS uses a queue.

### written
What is the time complexity of looking up a value in a balanced binary search tree?
- answer: O(log n) | log n | logn
- explain: Each comparison discards one subtree and a balanced tree has height O(log n); an unbalanced BST can degenerate into a linked list with O(n) lookups.

### written
Which data structure is normally used to implement a priority queue?
- answer: heap | binary heap | min-heap | max-heap | min heap | max heap
- explain: A binary heap gives O(1) peek and O(log n) insert and extract; it is stored compactly in an array, where the children of index i are at 2i+1 and 2i+2.

### written
What is the time complexity of accessing the i-th element of a linked list?
- answer: O(n) | n | linear
- explain: You have to follow i next-pointers from the head; an array computes the address directly in O(1), but a linked list inserts or deletes at a known node in O(1).

### truefalse
Binary search requires the input to be sorted.
- answer: true
- explain: Each step compares with the middle element and discards half, which only works if the order tells you which half can contain the target.

### written
What is the amortised time complexity of appending to a dynamic array, such as a Python list or a Java ArrayList?
- answer: O(1) | constant | constant time
- explain: When full, the array grows by a constant factor and copies everything in O(n), but this happens rarely enough that the average cost per append is O(1).

### written
A sorting algorithm that keeps equal elements in their original relative order is called ___.
- answer: stable
- explain: Stability lets you sort by several keys in successive passes; Python's sort and Java's sort for objects are both stable.

### written
What is the lower bound on the number of comparisons for comparison-based sorting?
- answer: Ω(n log n) | O(n log n) | n log n | nlogn | omega(n log n)
- explain: There are n! possible orderings and each comparison has two outcomes, so you need at least log2(n!) ≈ n log n comparisons; counting and radix sort avoid the bound by not comparing.

### multiple
Which algorithms find a minimum spanning tree?
- correct: Kruskal's algorithm | Prim's algorithm
- wrong: Dijkstra's algorithm | Floyd-Warshall
- explain: Kruskal adds the cheapest edges that do not create a cycle and Prim grows a single tree from a start node; Dijkstra and Floyd-Warshall compute shortest paths, not MSTs.

### written
What is the ordering of a directed acyclic graph called, in which every node comes before all the nodes it points to?
- answer: topological sort | topological order | topological sorting | topological ordering | toposort
- explain: Used for dependency resolution (build systems, course prerequisites); it exists only if there are no cycles and can be found with DFS or Kahn's algorithm in O(V + E).

### written
What is the time complexity of the naive recursive Fibonacci, `fib(n) = fib(n-1) + fib(n-2)`?
- answer: O(2^n) | O(2ⁿ) | 2^n | exponential | O(φ^n)
- explain: Every call branches in two and the same subproblems are recomputed over and over (the growth is about 1.618^n); memoisation brings it down to O(n).

### written
What is it called when two different keys hash to the same bucket?
- answer: collision | a collision | hash collision | a hash collision
- explain: Collisions are resolved by chaining (a list per bucket) or open addressing (probing for another slot); too many of them push lookups toward O(n).

### written
Which technique finds two numbers with a given sum in a sorted array in O(n) time?
- answer: two pointers | two-pointer | two pointer | two-pointer technique | two pointer technique
- explain: Start a pointer at each end: if the sum is too small move the left one right, if it is too big move the right one left; each step rules out one element.

### written
How much auxiliary space does merge sort use on an array?
- answer: O(n) | n | linear
- explain: Merging two sorted halves needs a temporary buffer as large as the input; heap sort, by contrast, sorts in place with O(1) extra space.

### written
Which data structure answers "are x and y in the same set?" with near-constant-time union and find operations?
- answer: union-find | union find | disjoint set | disjoint-set | disjoint set union | DSU
- explain: With path compression and union by rank each operation is O(α(n)), effectively constant; it is what makes Kruskal's algorithm fast.

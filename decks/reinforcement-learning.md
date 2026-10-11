---
schema: 1
topic: reinforcement-learning
---

### written
Under the Markov property, the future depends only on ___.
- answer: the current state | current state | the present state | present state | the state
- explain: Given the present state, the history adds no information about what happens next, so the state must summarise everything relevant.

### written
What is the discounted sum of future rewards from time t called?
- answer: the return | return | G_t | Gt | discounted return
- explain: The reward is the immediate signal at each step; the return G_t = R_{t+1} + γR_{t+2} + γ²R_{t+3} + … is what the agent tries to maximise in expectation.

### truefalse
With discount factor γ = 0, the agent only cares about the immediate reward.
- answer: true
- explain: A reward k steps ahead is weighted by γ^k, so γ = 0 keeps only R_{t+1}; γ close to 1 makes the agent far-sighted, and γ < 1 keeps infinite sums finite.

### written
What is the dilemma between trying new actions and choosing the best action found so far called?
- answer: exploration vs exploitation | exploration vs. exploitation | exploration-exploitation | exploration exploitation | exploration and exploitation | exploration-exploitation trade-off | exploration-exploitation tradeoff | exploration vs exploitation trade-off
- explain: Exploit too early and you may never find the best action; ε-greedy handles this by taking a random action with probability ε.

### written
Updating an estimate based on other estimates, as in the TD target R + γV(s'), is called ___.
- answer: bootstrapping | bootstrap
- explain: TD and DP bootstrap from the current value estimate of the next state; Monte Carlo waits for the actual return, so it does not bootstrap.

### written
Q-learning or SARSA: which one is off-policy?
- answer: Q-learning | Q learning | qlearning
- explain: Q-learning's target uses max over a' of Q(s', a'), the greedy policy, whatever action is actually taken next; SARSA uses the action its ε-greedy policy actually takes.

### multiple
Which of these make up the "deadly triad"?
- correct: Function approximation | Bootstrapping | Off-policy training
- wrong: Experience replay | Discounting
- explain: Combining all three can make value estimates diverge; with only two of them, learning can usually be kept stable (Sutton & Barto ch. 11).

### multiple
Which techniques does DQN use to stabilise training?
- correct: Experience replay | A separate target network
- wrong: A discount factor of exactly 1 | A tabular Q-function
- explain: Replay samples stored transitions at random, which breaks the correlation between consecutive samples; the target network is a periodically updated copy, so the TD target does not shift every step.

### written
What do policy-gradient methods such as REINFORCE optimise directly?
- answer: the policy | policy | the policy parameters | policy parameters
- explain: They adjust the parameters θ of the policy π along the gradient of expected return, so they handle stochastic policies and continuous actions naturally; actor-critic methods add a learned value function as a baseline.

### written
Which dynamic programming algorithm repeatedly applies the Bellman optimality update V(s) ← max_a Σ p(s', r | s, a)[r + γV(s')] to every state?
- answer: value iteration
- explain: It merges evaluation and improvement into a single sweep (policy iteration truncated to one evaluation step), whereas policy iteration fully evaluates each policy before improving it.

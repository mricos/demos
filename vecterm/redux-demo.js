#!/usr/bin/env node

// ==========================================
// REDUX CORE - Simple Implementation
// ==========================================

function createStore(reducer) {
  let state;
  let listeners = [];

  const getState = () => state;

  const dispatch = (action) => {
    console.log(`\n📤 DISPATCH: ${action.type}`);
    if (action.payload !== undefined) {
      console.log(`   Payload: ${JSON.stringify(action.payload)}`);
    }

    const prevState = JSON.stringify(state, null, 2);
    state = reducer(state, action);
    const newState = JSON.stringify(state, null, 2);

    if (prevState !== newState) {
      console.log(`\n🔄 STATE CHANGED`);
    }

    listeners.forEach(listener => listener());
    return action;
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  // Initialize state
  dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}

// ==========================================
// ACTION TYPES
// ==========================================

const LOGIN = 'LOGIN';
const LOGOUT = 'LOGOUT';
const ADD_TODO = 'ADD_TODO';
const TOGGLE_TODO = 'TOGGLE_TODO';
const REMOVE_TODO = 'REMOVE_TODO';
const INCREMENT = 'INCREMENT';
const DECREMENT = 'DECREMENT';

// ==========================================
// ACTION CREATORS
// ==========================================

const login = (username) => ({ type: LOGIN, payload: username });
const logout = () => ({ type: LOGOUT });
const addTodo = (text) => ({ type: ADD_TODO, payload: text });
const toggleTodo = (id) => ({ type: TOGGLE_TODO, payload: id });
const removeTodo = (id) => ({ type: REMOVE_TODO, payload: id });
const increment = () => ({ type: INCREMENT });
const decrement = () => ({ type: DECREMENT });

// ==========================================
// REDUCER
// ==========================================

const initialState = {
  user: {
    isLoggedIn: false,
    username: null
  },
  todos: [],
  counter: 0
};

let nextTodoId = 1;

function rootReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN:
      return {
        ...state,
        user: {
          isLoggedIn: true,
          username: action.payload
        }
      };

    case LOGOUT:
      return {
        ...state,
        user: {
          isLoggedIn: false,
          username: null
        }
      };

    case ADD_TODO:
      return {
        ...state,
        todos: [...state.todos, {
          id: nextTodoId++,
          text: action.payload,
          completed: false
        }]
      };

    case TOGGLE_TODO:
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };

    case REMOVE_TODO:
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload)
      };

    case INCREMENT:
      return {
        ...state,
        counter: state.counter + 1
      };

    case DECREMENT:
      return {
        ...state,
        counter: state.counter - 1
      };

    default:
      return state;
  }
}

// ==========================================
// CREATE STORE
// ==========================================

const store = createStore(rootReducer);

// Subscribe to state changes
store.subscribe(() => {
  const state = store.getState();
  console.log('\n📊 CURRENT STATE:');
  console.log(JSON.stringify(state, null, 2));
});

// ==========================================
// DEMO FUNCTIONS
// ==========================================

function showHelp() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     REDUX PATTERN DEMO - REPL MODE        ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('Available functions:');
  console.log('');
  console.log('🔐 AUTH:');
  console.log('  store.dispatch(login("username"))  - Login user');
  console.log('  store.dispatch(logout())           - Logout user');
  console.log('');
  console.log('📝 TODOS:');
  console.log('  store.dispatch(addTodo("text"))    - Add todo');
  console.log('  store.dispatch(toggleTodo(id))     - Toggle todo completion');
  console.log('  store.dispatch(removeTodo(id))     - Remove todo');
  console.log('');
  console.log('🔢 COUNTER:');
  console.log('  store.dispatch(increment())        - Increment counter');
  console.log('  store.dispatch(decrement())        - Decrement counter');
  console.log('');
  console.log('📊 STATE:');
  console.log('  store.getState()                   - Get current state');
  console.log('  showState()                        - Pretty print state');
  console.log('');
  console.log('🎯 QUICK DEMO:');
  console.log('  runDemo()                          - Run interactive demo');
  console.log('');
}

function showState() {
  const state = store.getState();
  console.log('\n📊 CURRENT STATE:');
  console.log(JSON.stringify(state, null, 2));
}

function runDemo() {
  console.log('\n🎬 Running Redux Demo...\n');

  console.log('═══════════════════════════════════════');
  console.log('Step 1: Login');
  console.log('═══════════════════════════════════════');
  store.dispatch(login('demo-user'));

  setTimeout(() => {
    console.log('\n═══════════════════════════════════════');
    console.log('Step 2: Add Todos');
    console.log('═══════════════════════════════════════');
    store.dispatch(addTodo('Learn Redux'));

    setTimeout(() => {
      store.dispatch(addTodo('Build an app'));

      setTimeout(() => {
        store.dispatch(addTodo('Deploy to production'));

        setTimeout(() => {
          console.log('\n═══════════════════════════════════════');
          console.log('Step 3: Complete a Todo');
          console.log('═══════════════════════════════════════');
          store.dispatch(toggleTodo(1));

          setTimeout(() => {
            console.log('\n═══════════════════════════════════════');
            console.log('Step 4: Increment Counter');
            console.log('═══════════════════════════════════════');
            store.dispatch(increment());
            store.dispatch(increment());
            store.dispatch(increment());

            setTimeout(() => {
              console.log('\n═══════════════════════════════════════');
              console.log('Step 5: Remove a Todo');
              console.log('═══════════════════════════════════════');
              store.dispatch(removeTodo(2));

              setTimeout(() => {
                console.log('\n✅ Demo complete! Try the functions yourself.\n');
                console.log('Type showHelp() to see available commands.\n');
              }, 500);
            }, 500);
          }, 500);
        }, 500);
      }, 500);
    }, 500);
  }, 500);
}

// ==========================================
// EXPORT FOR REPL
// ==========================================

// Make everything available globally for REPL
global.store = store;
global.login = login;
global.logout = logout;
global.addTodo = addTodo;
global.toggleTodo = toggleTodo;
global.removeTodo = removeTodo;
global.increment = increment;
global.decrement = decrement;
global.showState = showState;
global.showHelp = showHelp;
global.runDemo = runDemo;

// ==========================================
// STARTUP
// ==========================================

if (require.main === module) {
  // Running directly
  console.clear();
  showHelp();
  console.log('💡 TIP: Run runDemo() to see it in action!\n');

  // Start REPL
  const repl = require('repl');
  const replServer = repl.start({
    prompt: 'redux> ',
    useColors: true
  });

  // Add functions to REPL context
  replServer.context.store = store;
  replServer.context.login = login;
  replServer.context.logout = logout;
  replServer.context.addTodo = addTodo;
  replServer.context.toggleTodo = toggleTodo;
  replServer.context.removeTodo = removeTodo;
  replServer.context.increment = increment;
  replServer.context.decrement = decrement;
  replServer.context.showState = showState;
  replServer.context.showHelp = showHelp;
  replServer.context.runDemo = runDemo;
} else {
  // Being required as a module
  module.exports = {
    store,
    login,
    logout,
    addTodo,
    toggleTodo,
    removeTodo,
    increment,
    decrement,
    showState,
    showHelp,
    runDemo
  };
}

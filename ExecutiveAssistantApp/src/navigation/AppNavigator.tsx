import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import BriefScreen from '../screens/BriefScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import EmailDetailScreen from '../screens/EmailDetailScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Brief: undefined;
  Settings: undefined;
  Activity: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  EmailDetail: { emailThread: any };
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createStackNavigator<MainStackParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <MainTab.Screen 
        name="Brief" 
        component={BriefScreen}
        options={{
          tabBarLabel: 'Brief',
        }}
      />
      <MainTab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
      <MainTab.Screen 
        name="Activity" 
        component={ActivityScreen}
        options={{
          tabBarLabel: 'Activity',
        }}
      />
    </MainTab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="EmailDetail" 
        component={EmailDetailScreen}
        options={{ 
          title: 'Email Detail',
          headerBackTitleVisible: false,
        }}
      />
    </MainStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // TODO: Add loading screen
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
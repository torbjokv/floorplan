Feature: Project Menu
  As a user of the floorplan designer
  I want to manage my projects through a menu
  So that I can save, load, and organize my floor plans

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: Opening the project menu
    When I click on the "Projects" button
    Then the project menu should be visible
    And the menu should contain "New Project" option
    And the menu should contain "Load Example" option

  Scenario: Creating a new project
    When I click on the "Projects" button
    And I click on "New Project" in the menu
    Then a new empty project should be created
    And the project name should be "Untitled Project"
    And the floorplan should be empty

  Scenario: Loading the example project
    When I click on the "Projects" button
    And I click on "Load Example" in the menu
    Then the example project should be loaded
    And the project should contain rooms
    And I should see the floorplan preview

  Scenario: Saving a project to localStorage
    Given I have created a room
    When I wait for 500ms
    Then the project should be saved to localStorage
    And localStorage should contain the project data

  Scenario: Duplicating a project
    Given I have a saved project named "Test Project"
    When I click on the "Projects" button
    And I click on "Duplicate" for the project
    Then a new project should be created with name "Test Project 2"
    And both projects should exist in localStorage

  Scenario: Deleting a project
    Given I have a saved project named "Test Project"
    When I click on the "Projects" button
    And I click on "Delete" for the project
    Then the project should be removed from the list
    And the project should not exist in localStorage

  Scenario: Downloading project as JSON
    Given I have a project with rooms
    When I click on the "Projects" button
    And I click on "Download JSON"
    Then a JSON file should be downloaded
    And the file should contain the project data

  Scenario: Uploading a JSON file
    Given I have a valid floorplan JSON file
    When I click on the "Projects" button
    And I upload the JSON file
    Then the project should be loaded from the file
    And the floorplan should match the uploaded data

  Scenario: Sharing a project via URL
    Given I have a project with rooms
    When I click on "Share" button
    Then the URL should be copied to clipboard
    And the URL should contain the project data
    And opening the URL in a new tab should load the project

  Scenario: Project list is sorted naturally
    Given I have saved projects named "Project 2", "Project 10", and "Project 1"
    When I click on the "Projects" button
    Then the projects should be listed in order: "Project 1", "Project 2", "Project 10"

  Scenario: Read-only mode for shared projects
    Given I open a shared project URL
    Then the project should be in read-only mode
    And I should see a "Duplicate to Edit" message
    And changes should not be auto-saved

  Scenario: Menu closes when clicking outside
    When I click on the "Projects" button
    And the project menu is visible
    When I click outside the menu
    Then the project menu should close

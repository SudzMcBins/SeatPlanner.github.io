# optimizer.py
import numpy as np
import random
from typing import List, Dict, Tuple, Set
import json # Import json for potential data exchange if needed

class SeatingChartOptimizer:
    def __init__(self,
                 students: List[str],
                 desks: List[Tuple[float, float, int]],  # (x, y, group_id)
                 preferences: Dict[str, List[str]]):
        print("Optimizer Initializing...")
        print(f"Received {len(students)} students and {len(desks)} desks.")

        if len(students) > len(desks):
            raise ValueError(f"Not enough desks: {len(students)} students but only {len(desks)} desks provided.")
        else:
            # Now we allow extra desks.
            self.desks = desks
        self.n_students = len(students)

        self.students = [str(s).lower() for s in students]
        self.preferences = {str(k).lower(): [str(v).lower() for v in val] for k, val in preferences.items()}

        all_students_set = set(self.students)
        for student, prefs in self.preferences.items():
            valid_prefs = [p for p in prefs if p in all_students_set]
            self.preferences[student] = valid_prefs

        self.distance_matrix = self._calculate_distance_matrix()
        print("Distance matrix calculated.")
    
    def _calculate_distance_matrix(self) -> np.ndarray:
        """Calculate distances between all desk pairs."""
        n_desks = len(self.desks)
        dist_matrix = np.zeros((n_desks, n_desks))

        for i in range(n_desks):
            for j in range(i + 1, n_desks): # Only calculate upper triangle
                x1, y1, _ = self.desks[i]
                x2, y2, _ = self.desks[j]
                # Use float positions directly
                distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                dist_matrix[i, j] = distance
                dist_matrix[j, i] = distance # Matrix is symmetric

        # Add a small epsilon to avoid division by zero if max_distance is 0 (all desks at same spot)
        self.max_distance = np.max(dist_matrix) + 1e-9
        if self.max_distance <= 1e-9:
             print("Warning: All desks seem to be at the same position.")
             self.max_distance = 1.0 # Avoid division by zero, assign arbitrary max distance

        return dist_matrix

    def _calculate_fitness(self, solution: List[int]) -> Tuple[float, float]:
        """
        Calculate the fitness of a solution based on preference satisfaction.
        Here solution is a list of desk indices (one per student).
        Returns: (overall_fitness, unfairness_score)
        """
        # Assign each student the desk at the corresponding index in the solution.
        # Example: student at position i in self.students is assigned to desk solution[i]
        student_positions = {student: solution[i] for i, student in enumerate(self.students)}
        satisfaction_scores = {}
        total_satisfaction_sum = 0.0

        for student in self.students:
            assigned_desk = student_positions[student]
            prefs = self.preferences.get(student, [])  # Get preferences; could be empty

            if not prefs:
                satisfaction_scores[student] = 1.0
                total_satisfaction_sum += 1.0
                continue

            current_student_satisfaction = 0.0
            for preferred_student in prefs:
                if preferred_student in student_positions:
                    preferred_desk = student_positions[preferred_student]
                    distance = self.distance_matrix[assigned_desk, preferred_desk]
                    # Inverse distance scoring: closer is better
                    satisfaction = 1.0 - (distance / self.max_distance)
                    current_student_satisfaction += max(0.0, satisfaction)
            normalized_satisfaction = current_student_satisfaction / len(prefs)
            satisfaction_scores[student] = normalized_satisfaction
            total_satisfaction_sum += normalized_satisfaction

        overall_satisfaction = total_satisfaction_sum / self.n_students if self.n_students else 0
        all_scores = list(satisfaction_scores.values())
        unfairness = 10 * np.std(all_scores) if len(all_scores) > 0 else 0

        return overall_satisfaction, unfairness

    def _crossover(self, parent1: List[str], parent2: List[str]) -> List[str]:
        """Order Crossover (OX1)"""
        size = len(parent1)
        child = [None] * size

        # Choose two random crossover points
        start, end = sorted(random.sample(range(size), 2))

        # Copy the segment from parent1 to the child
        child[start:end+1] = parent1[start:end+1]
        parent1_segment_set = set(parent1[start:end+1])

        # Fill the remaining positions from parent2, preserving order
        current_pos = (end + 1) % size
        parent2_idx = (end + 1) % size

        while None in child:
            if parent2[parent2_idx] not in parent1_segment_set:
                child[current_pos] = parent2[parent2_idx]
                current_pos = (current_pos + 1) % size
            parent2_idx = (parent2_idx + 1) % size # Move to next element in parent2

        return child


    def _mutate(self, solution: List[str], mutation_rate: float = 0.1) -> List[str]:
        """Mutate a solution by swapping two random students."""
        mutated_solution = solution[:] # Work on a copy
        if random.random() < mutation_rate:
             idx1, idx2 = random.sample(range(len(mutated_solution)), 2)
             mutated_solution[idx1], mutated_solution[idx2] = mutated_solution[idx2], mutated_solution[idx1]
        return mutated_solution


    def optimize(self,
                 population_size: int = 100,
                 generations: int = 500,
                 mutation_rate: float = 0.6,
                 elite_size: int = 10) -> Dict:
        """Run the genetic algorithm to optimize seating chart."""
        print(f"Starting optimization: Pop={population_size}, Gen={generations}, Mut={mutation_rate}, Elite={elite_size}")
        if not self.students:
             print("No students to optimize.")
             return {'seating_chart': {}, 'overall_satisfaction': 0, 'unfairness_score': 0, 'student_order': []}

        population = []
        available_indices = list(range(len(self.desks)))
        for _ in range(population_size):
            solution = random.sample(available_indices, self.n_students)
            population.append(solution)

        best_solution_overall = None
        best_fitness_overall = (-1.0, float('inf'))  # (satisfaction, unfairness)
        biodiversity_history = []  # Track biodiversity at intervals

        def tournament_selection(pop_with_fitness, k=5):
            selection_ix = random.sample(range(len(pop_with_fitness)), k)
            best = None
            for i in selection_ix:
                current_solution, current_fitness = pop_with_fitness[i]
                if best is None or \
                   current_fitness[0] > pop_with_fitness[best][1][0] or \
                   (current_fitness[0] == pop_with_fitness[best][1][0] and current_fitness[1] < pop_with_fitness[best][1][1]):
                    best = i
            return pop_with_fitness[best][0]

        for gen in range(generations):
            pop_with_fitness = []
            for solution in population:
                 fitness = self._calculate_fitness(solution)
                 pop_with_fitness.append((solution, fitness))

            pop_with_fitness.sort(key=lambda x: (x[1][0], -x[1][1]), reverse=True)

            current_best_solution, current_best_fitness = pop_with_fitness[0]
            if best_solution_overall is None or \
               current_best_fitness[0] > best_fitness_overall[0] or \
               (current_best_fitness[0] == best_fitness_overall[0] and current_best_fitness[1] < best_fitness_overall[1]):
                best_solution_overall = current_best_solution[:]
                best_fitness_overall = current_best_fitness

            new_population = []
            elite = [sol for sol, _ in pop_with_fitness[:elite_size]]
            new_population.extend(elite)

            while len(new_population) < population_size:
                parent1 = tournament_selection(pop_with_fitness)
                parent2 = tournament_selection(pop_with_fitness)
                child = self._crossover(parent1, parent2)
                child = self._mutate(child, mutation_rate)
                new_population.append(child)

            population = new_population

            if gen % 50 == 0 or gen == generations - 1:
                # Calculate biodiversity as the count of unique solutions
                diversity = len({tuple(sol) for sol in population})
                biodiversity_history.append((gen, diversity))
                print(f"Generation {gen}: Best Fitness (Sat, Fair) = ({best_fitness_overall[0]:.4f}, {best_fitness_overall[1]:.4f}), Biodiversity = {diversity}")

        final_seating_chart = {}
        if best_solution_overall:
            for i, student in enumerate(self.students):
                 desk_index = best_solution_overall[i]
                 desk_details = self.desks[desk_index]
                 final_seating_chart[student] = {
                     'position': desk_details[:2],
                     'group': desk_details[2]
                 }
        else:
             print("Warning: Optimization finished without finding a best solution.")
             best_solution_overall = []

        result = {
            'overall_satisfaction': best_fitness_overall[0],
            'unfairness_score': best_fitness_overall[1],
            'student_order': best_solution_overall,
            'seating_chart': final_seating_chart,
            'biodiversity_history': biodiversity_history  # Added biodiversity tracking
        }
        print("Optimization Finished.")
        return result# Note: No example usage or visualization call here.
# The functions will be called from JavaScript via Pyodide.
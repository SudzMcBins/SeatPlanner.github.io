# optimizer.py
import numpy as np
import random
from typing import List, Dict, Tuple, Set, Optional
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
        
        self.desks = desks
        self.n_students = len(students)
        self.students = [str(s).lower() for s in students] # Ensure consistent casing
        
        # Ensure preference keys and values are consistently cased and valid
        processed_preferences = {}
        all_students_set = set(self.students)
        for student_key, pref_list in preferences.items():
            s_key_lower = str(student_key).lower()
            if s_key_lower in all_students_set: # Only consider preferences of students in the list
                valid_prefs = [str(p).lower() for p in pref_list if str(p).lower() in all_students_set]
                processed_preferences[s_key_lower] = valid_prefs
        self.preferences = processed_preferences

        self.distance_matrix = self._calculate_distance_matrix()
        print("Distance matrix calculated.")
    
    def _calculate_distance_matrix(self) -> np.ndarray:
        """Calculate distances between all desk pairs."""
        n_desks = len(self.desks)
        dist_matrix = np.zeros((n_desks, n_desks))

        if n_desks == 0: # Handle empty desks list
            self.max_distance = 1.0 # Default for normalization
            return dist_matrix

        for i in range(n_desks):
            for j in range(i + 1, n_desks):
                x1, y1, _ = self.desks[i]
                x2, y2, _ = self.desks[j]
                distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                dist_matrix[i, j] = distance
                dist_matrix[j, i] = distance

        current_max_dist = np.max(dist_matrix)
        if current_max_dist == 0: # All desks at the same position or only one desk
             # print("Warning: Max distance between desks is 0. All desks might be at the same position.")
             self.max_distance = 1.0 # Avoid division by zero, assign arbitrary max distance for normalization
        else:
            self.max_distance = current_max_dist
        
        # Add epsilon for strict positive max_distance to prevent division by zero in fitness if distances are extremely small
        self.max_distance += 1e-9 
        
        return dist_matrix

    def _calculate_fitness(self, solution: List[int]) -> Tuple[float, float]:
        """
        Calculate the fitness of a solution.
        solution: A list of desk indices, where solution[i] is the desk for self.students[i].
        Returns: (overall_satisfaction, unfairness_score)
        """
        if self.n_students == 0: # Should be caught by optimize(), but as a safeguard
            return 0.0, 0.0
            
        student_positions = {self.students[i]: solution[i] for i in range(self.n_students)}
        
        satisfaction_scores = {} # Using dict for potentially easier debugging if needed
        total_satisfaction_sum = 0.0

        for i in range(self.n_students):
            student = self.students[i]
            assigned_desk_idx = solution[i] # Desk index for current student
            
            prefs = self.preferences.get(student, [])

            if not prefs:
                satisfaction_scores[student] = 1.0 # Max satisfaction if no preferences
                total_satisfaction_sum += 1.0
                continue

            current_student_satisfaction = 0.0
            for preferred_student_name in prefs:
                # Preferred student must be in the current seating chart to be considered
                if preferred_student_name in student_positions:
                    preferred_desk_idx = student_positions[preferred_student_name]
                    distance = self.distance_matrix[assigned_desk_idx, preferred_desk_idx]
                    
                    # Inverse distance scoring: closer is better. Normalized.
                    satisfaction_value = 1.0 - (distance / self.max_distance)
                    current_student_satisfaction += max(0.0, satisfaction_value) # Ensure satisfaction is not negative
            
            normalized_satisfaction = current_student_satisfaction / len(prefs)
            satisfaction_scores[student] = normalized_satisfaction
            total_satisfaction_sum += normalized_satisfaction

        overall_satisfaction = total_satisfaction_sum / self.n_students
        
        all_individual_scores = list(satisfaction_scores.values())
        # Unfairness: standard deviation of individual satisfaction scores, scaled
        unfairness = 10 * np.std(all_individual_scores) if len(all_individual_scores) > 0 else 0

        return overall_satisfaction, unfairness

    def _crossover(self, parent1: List[int], parent2: List[int]) -> List[int]:
        """Order Crossover (OX1) for desk assignments."""
        size = self.n_students # Length of a solution is number of students
        child: List[Optional[int]] = [None] * size

        start, end = sorted(random.sample(range(size), 2))
        
        # Copy the segment from parent1 to the child
        child[start:end+1] = parent1[start:end+1]
        
        # Values from parent1's segment that are now in child
        parent1_segment_values = set(parent1[start:end+1]) # These are desk indices

        # Fill remaining slots from parent2
        # Start filling from (end + 1) in child, using items from parent2 starting at (end + 1)
        child_fill_idx = (end + 1) % size
        parent2_iter_idx = (end + 1) % size
        
        items_filled_from_parent1 = (end - start + 1)
        items_to_fill_from_parent2 = size - items_filled_from_parent1
        
        filled_from_p2_count = 0
        while filled_from_p2_count < items_to_fill_from_parent2:
            # Get desk index from parent2
            item_from_parent2 = parent2[parent2_iter_idx]
            
            # If this desk from parent2 is not already taken by parent1's segment
            if item_from_parent2 not in parent1_segment_values:
                # Find the next available (None) slot in child
                while child[child_fill_idx] is not None:
                     child_fill_idx = (child_fill_idx + 1) % size
                
                child[child_fill_idx] = item_from_parent2
                # child_fill_idx = (child_fill_idx + 1) % size # Advance for next potential fill
                filled_from_p2_count += 1
            
            parent2_iter_idx = (parent2_iter_idx + 1) % size # Always advance in parent2

        return child # type: ignore # Child is guaranteed to be List[int]

    def _swap_mutate(self, solution: List[int]) -> List[int]:
        """Mutate a solution by swapping desk assignments for two students."""
        mutated_solution = solution[:]
        if self.n_students >= 2: # Need at least two students to swap their assigned desks
            idx1, idx2 = random.sample(range(self.n_students), 2)
            # Swap the desks assigned to student idx1 and student idx2
            mutated_solution[idx1], mutated_solution[idx2] = mutated_solution[idx2], mutated_solution[idx1]
        return mutated_solution

    def _change_desk_mutate(self, solution: List[int]) -> List[int]:
        """
        Mutate by changing one student's assigned desk to a currently unused desk.
        If no unused desks or no students, returns a copy of the original solution.
        """
        mutated_solution = solution[:]
        if not self.n_students or len(self.desks) == self.n_students:
            # No students to assign, or no spare desks to change to.
            return mutated_solution

        student_to_change_idx = random.randrange(self.n_students) # Index of student in self.students
        
        current_assigned_desks = set(mutated_solution) # Set of desk indices currently in use
        
        # Find desks that are not in current_assigned_desks
        unassigned_desks = [desk_idx for desk_idx in range(len(self.desks)) 
                            if desk_idx not in current_assigned_desks]

        if not unassigned_desks:
            # This case implies all desks are assigned,
            # which should be covered by len(self.desks) == self.n_students check.
            return mutated_solution # No change possible
            
        new_desk_for_student = random.choice(unassigned_desks)
        mutated_solution[student_to_change_idx] = new_desk_for_student
        return mutated_solution

    def _tournament_selection(self, pop_with_fitness: List[Tuple[List[int], Tuple[float, float]]], k: int) -> List[int]:
        """Selects one individual using tournament selection."""
        # k is tournament size
        if not pop_with_fitness: # Should not happen if population_size > 0
            raise ValueError("Population for tournament selection is empty.")
        
        # Ensure k is valid for the number of available candidates
        actual_k = min(k, len(pop_with_fitness))
        if actual_k <= 0 : actual_k = 1

        selected_indices = random.sample(range(len(pop_with_fitness)), actual_k)
        
        best_candidate_solution = None
        # Fitness: (satisfaction, unfairness). Higher satisfaction is better, lower unfairness is better.
        best_fitness_in_tournament = (-float('inf'), float('inf')) 

        for idx in selected_indices:
            solution, fitness = pop_with_fitness[idx]
            if fitness[0] > best_fitness_in_tournament[0] or \
               (fitness[0] == best_fitness_in_tournament[0] and fitness[1] < best_fitness_in_tournament[1]):
                best_fitness_in_tournament = fitness
                best_candidate_solution = solution
        
        # Fallback if all chosen candidates were somehow identical in a way that didn't update (highly unlikely)
        # or if best_candidate_solution is still None (e.g., if actual_k was 0, though guarded)
        if best_candidate_solution is None:
            return pop_with_fitness[selected_indices[0]][0] 

        return best_candidate_solution


    def optimize(self,
                 population_size: int = 100,
                 generations: int = 500,
                 mutation_rate: float = 0.6, # Base probability an individual is mutated
                 elite_size: int = 10,
                 max_stagnation_generations: int = 50, # For early stopping
                 change_desk_mutation_prob: float = 0.3 # P(use _change_desk_mutate over _swap_mutate)
                 ) -> Dict:
        print(f"Starting optimization: Pop={population_size}, Gen={generations}, MutRate(base)={mutation_rate}, Elite={elite_size}")
        print(f"Early stopping if no improvement for {max_stagnation_generations} generations.")
        can_use_change_desk_mutate = len(self.desks) > self.n_students
        print(f"Prob. of 'change desk' mutation: {change_desk_mutation_prob if can_use_change_desk_mutate else 'N/A (no spare desks or mutation prob is 0)'}")


        if not self.students:
             print("No students to optimize.")
             return {'seating_chart': {}, 'overall_satisfaction': 0, 'unfairness_score': 0, 'student_order': [], 'biodiversity_history': []}
        
        if elite_size < 0: elite_size = 0
        if population_size <= 0: population_size = 1 # Need at least one individual
        if elite_size >= population_size:
            print(f"Warning: Elite size ({elite_size}) is >= population size ({population_size}). Reducing elite_size.")
            elite_size = max(0, int(population_size / 2)) if population_size > 1 else 0
            print(f"Adjusted elite_size to {elite_size}")


        population: List[List[int]] = []
        available_desk_indices = list(range(len(self.desks)))
        for _ in range(population_size):
            solution = random.sample(available_desk_indices, self.n_students)
            population.append(solution)

        best_solution_overall: Optional[List[int]] = None
        best_fitness_overall = (-1.0, float('inf'))  # (satisfaction DESC, unfairness ASC)
        
        biodiversity_history = []
        generations_without_improvement = 0
        
        base_mutation_rate = mutation_rate 
        current_dynamic_mutation_rate = base_mutation_rate
        stagnation_threshold_for_boost = max(1, max_stagnation_generations // 3)

        for gen in range(generations):
            pop_with_fitness: List[Tuple[List[int], Tuple[float, float]]] = []
            for solution_candidate in population:
                 fitness = self._calculate_fitness(solution_candidate)
                 pop_with_fitness.append((solution_candidate, fitness))

            pop_with_fitness.sort(key=lambda x: (x[1][0], -x[1][1]), reverse=True)

            current_gen_best_solution, current_gen_best_fitness = pop_with_fitness[0]

            improved_this_generation = False
            if best_solution_overall is None or \
               current_gen_best_fitness[0] > best_fitness_overall[0] or \
               (current_gen_best_fitness[0] == best_fitness_overall[0] and current_gen_best_fitness[1] < best_fitness_overall[1]):
                best_solution_overall = current_gen_best_solution[:]
                best_fitness_overall = current_gen_best_fitness
                generations_without_improvement = 0
                improved_this_generation = True
                current_dynamic_mutation_rate = base_mutation_rate # Reset boost on improvement
            else:
                generations_without_improvement += 1

            # Adaptive mutation rate adjustment
            if not improved_this_generation and generations_without_improvement > stagnation_threshold_for_boost:
                # Boost mutation rate, but don't let it go beyond a reasonable max (e.g., 0.95)
                current_dynamic_mutation_rate = min(0.95, base_mutation_rate * 1.5) 
            # If improved, it's reset to base. If not stagnated enough for boost, it remains base or its boosted value from previous stagnation.
            # To ensure it reverts to base if not boosted this cycle:
            elif not (generations_without_improvement > stagnation_threshold_for_boost) : # Not stagnated enough for boost OR improved
                 current_dynamic_mutation_rate = base_mutation_rate


            if generations_without_improvement >= max_stagnation_generations:
                print(f"Stopping early at generation {gen+1} due to stagnation for {max_stagnation_generations} generations.")
                break
            
            new_population: List[List[int]] = []
            # Elitism: Copy best individuals to new population
            elite_solutions = [sol for sol, _ in pop_with_fitness[:elite_size]]
            new_population.extend(elite_solutions)

            # Tournament selection and breeding for the rest
            tournament_k = 5 # Standard tournament size
            
            while len(new_population) < population_size:
                parent1 = self._tournament_selection(pop_with_fitness, k=tournament_k)
                parent2 = self._tournament_selection(pop_with_fitness, k=tournament_k)
                
                child = self._crossover(parent1, parent2)
                
                if random.random() < current_dynamic_mutation_rate: # Check if mutation occurs
                    # Decide which mutation operator to use
                    use_change_desk_op = (can_use_change_desk_mutate and 
                                          random.random() < change_desk_mutation_prob)
                    if use_change_desk_op:
                        child = self._change_desk_mutate(child)
                    else:
                        child = self._swap_mutate(child)
                
                new_population.append(child)

            population = new_population

            if gen % 25 == 0 or gen == generations - 1 or improved_this_generation: # Log more often if improved or at milestones
                diversity = len({tuple(sol) for sol in population}) # Unique solutions
                biodiversity_history.append((gen + 1, diversity))
                log_msg = (f"Generation {gen+1}/{generations}: Best Fitness (Sat, Fair) = ({best_fitness_overall[0]:.4f}, {best_fitness_overall[1]:.4f}), "
                           f"Diversity = {diversity}, DynMutRate = {current_dynamic_mutation_rate:.2f}")
                if improved_this_generation: log_msg += " (* Improved!)"
                if current_dynamic_mutation_rate != base_mutation_rate: log_msg += " (Rate Boosted)"
                print(log_msg)
        
        # Construct final results
        final_seating_chart = {}
        student_order_names = ["Empty"] * len(self.desks) 

        if best_solution_overall:
            for student_idx, assigned_desk_idx in enumerate(best_solution_overall):
                student_name = self.students[student_idx]
                desk_details = self.desks[assigned_desk_idx]
                
                final_seating_chart[student_name] = {
                    'position': desk_details[:2], 
                    'group': desk_details[2]      
                }
                if 0 <= assigned_desk_idx < len(student_order_names):
                    student_order_names[assigned_desk_idx] = student_name
                else: 
                    print(f"Error: Invalid desk index {assigned_desk_idx} for student {student_name} in best solution.")
        else: 
            print("Warning: Optimization finished without finding a best solution (best_solution_overall is None).")

        result = {
            'overall_satisfaction': best_fitness_overall[0],
            'unfairness_score': best_fitness_overall[1],
            'student_order': student_order_names,
            'seating_chart': final_seating_chart,
            'biodiversity_history': biodiversity_history
        }
        print("Optimization Finished.")
        return result
